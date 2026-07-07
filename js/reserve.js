document.addEventListener('DOMContentLoaded', () => {

    // === ⭐️ 2026년 운영 정책 설정 ===
    const RULES = {
        "장소 1 (문원 체육공원)": {
            start: "2026-07-11",
            end: "2026-08-17",
            closedDays: [1], // 매주 월요일(1) 휴장
            exceptions: ["2026-08-17"], 
            capacity: 60,    
            slots: [
                "1회차 "
            ]
        },
    };

    const API_BASE = 'https://reservation-api.tonycho999.workers.dev';

    let currentYear = 2026;
    let currentMonth = 7;
    
    let selectedLocation = document.querySelector('input[name="locationSelect"]:checked')?.value;
    if (!selectedLocation || !RULES[selectedLocation]) {
        selectedLocation = "서서울호수공원 문화테크광장"; 
    }

    const calendarBody = document.getElementById('calendarBody');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const timeListContainer = document.getElementById('timeList');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const hiddenDateInput = document.getElementById('date');

    // 기본 시간표 비활성화 렌더링
    function renderDefaultTimeSlots(locationName) {
        const rule = RULES[locationName];
        if (!rule) return;

        timeListContainer.innerHTML = ''; 
        rule.slots.forEach(slot => {
            const label = document.createElement('label');
            label.className = 'time-item disabled'; 
            label.innerHTML = `
                <input type="radio" name="timeSlot" value="${slot}" disabled>
                <span style="color:#999;">
                    ${slot} <br>
                    <small>(날짜를 먼저 선택해주세요)</small>
                </span>
            `;
            timeListContainer.appendChild(label);
        });
    }

    // 장소 탭 변경 이벤트
    const locationRadios = document.querySelectorAll('input[name="locationSelect"]');
    locationRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.tab-label').forEach(label => {
                label.style.borderColor = '#ccc';
                label.querySelector('.tab-text').style.color = '#666';
                label.querySelector('.tab-text').style.fontWeight = 'normal';
            });
            e.target.parentElement.style.borderColor = '#0056b3';
            e.target.parentElement.querySelector('.tab-text').style.color = '#0056b3';
            e.target.parentElement.querySelector('.tab-text').style.fontWeight = 'bold';
            
            selectedLocation = e.target.value;
            hiddenDateInput.value = ''; 
            selectedDateDisplay.textContent = '날짜를 먼저 선택해주세요';
            
            renderCalendar(currentYear, currentMonth);
            renderDefaultTimeSlots(selectedLocation); 
        });
    });

    // === ⭐️ 주차별 예약 오픈 스케줄 반영 로직 ===
    function isSelectable(dateStr, rule) {
        const [y, m, d] = dateStr.split('-').map(Number);
        
        // 대상(예약하려는) 날짜 객체 생성
        const targetDate = new Date(y, m - 1, d, 0, 0, 0);
        
        // 운영 기간 설정
        const start = new Date(rule.start);
        const end = new Date(rule.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        // 1. 기본 운영기간 및 휴장일 체크
        if (targetDate < start || targetDate > end) return false;
        if (!rule.exceptions?.includes(dateStr) && rule.closedDays.includes(targetDate.getDay())) return false;

        // 2. 주차별 월요일 오전 10시 오픈 매핑 테이블 매칭
        let openTimeISO = "";
        if (selectedLocation === "장소 1 (문원 체육공원)") {
            if (dateStr >= "2026-07-21" && dateStr <= "2026-08-23") openTimeISO = "2026-07-20T19:00:00";
            else if (dateStr >= "2026-08-21" && dateStr <= "2026-08-26") openTimeISO = "2026-08-20T10:00:00";
        }

        // 범위에 속하지 않는 예외 날짜 예약 차단
        if (!openTimeISO) return false;

        const [oy, om, od] = openTimeISO.split('T')[0].split('-').map(Number);
        const [oh, omin, os] = openTimeISO.split('T')[1].split(':').map(Number);
        const openTime = new Date(oy, om - 1, od, oh, omin, os);

        // 3. 현재 한국 시간(KST) 구하기
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Seoul',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const kst = {};
        parts.forEach(p => kst[p.type] = p.value);
        const currentKst = new Date(kst.year, kst.month - 1, kst.day, kst.hour, kst.minute, kst.second);
        
        // 4. 아직 지정된 오픈 시간 전이라면 예약 불가
        if (currentKst < openTime) return false;

        // 5. 이미 지나간 과거 날짜 예약 불가
        const currentOnlyDate = new Date(kst.year, kst.month - 1, kst.day, 0, 0, 0);
        if (currentOnlyDate > targetDate) return false;

        return true; 
    }

    function renderCalendar(year, month) {
        calendarBody.innerHTML = '';
        currentMonthDisplay.textContent = `${year}년 ${month}월`;
        
        const stepDesc = document.querySelector('.calendar-table').nextElementSibling;
        if (stepDesc) {
            stepDesc.innerHTML = `원하시는 날짜를 선택하세요.<br><span style="color:#0056b3; font-weight:bold; font-size:0.9em;">(예약은 매주 월요일 오전 10시에 차례로 오픈됩니다)</span>`;
        }
        
        const firstDay = new Date(year, month - 1, 1).getDay();
        const lastDate = new Date(year, month, 0).getDate();
        const rule = RULES[selectedLocation];

        let date = 1;
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');
                if (i === 0 && j < firstDay) { } 
                else if (date > lastDate) { } 
                else {
                    cell.textContent = date;
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                    
                    if (isSelectable(dateStr, rule)) {
                        cell.style.cursor = 'pointer';
                        cell.addEventListener('click', () => handleDateClick(cell, dateStr));
                    } else {
                        cell.classList.add('disabled');
                        cell.title = '아직 예약이 오픈되지 않았거나 예약 불가한 날짜(휴장일 등)입니다.\n(예약은 매주 월요일 오전 10시 오픈)';
                    }
                    date++;
                }
                row.appendChild(cell);
            }
            calendarBody.appendChild(row);
            if (date > lastDate) break;
        }
    }

    // 달력 좌우 이동
    document.getElementById('prevMonth').addEventListener('click', () => {
        if (currentMonth === 1) { currentMonth = 12; currentYear--; } else { currentMonth--; }
        renderCalendar(currentYear, currentMonth);
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        if (currentMonth === 12) { currentMonth = 1; currentYear++; } else { currentMonth++; }
        renderCalendar(currentYear, currentMonth);
    });

    // === 잔여인원 로드 ===
    async function handleDateClick(cell, dateStr) {
        document.querySelectorAll('#calendarBody td').forEach(td => td.classList.remove('selected'));
        cell.classList.add('selected');
        
        hiddenDateInput.value = dateStr;
        selectedDateDisplay.textContent = dateStr; 
        
        timeListContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">잔여 인원 조회 중...</p>';

        const rule = RULES[selectedLocation];
        
        try {
            const response = await fetch(`${API_BASE}/api/capacity?location=${encodeURIComponent(selectedLocation)}&date=${dateStr}`);
            const bookedData = await response.json();
            
            const bookedMap = {};
            bookedData.forEach(item => {
                bookedMap[item.time_slot] = item.booked;
            });

            timeListContainer.innerHTML = ''; 
            
            rule.slots.forEach(slot => {
                const bookedCount = bookedMap[slot] || 0;
                const remainCount = rule.capacity - bookedCount;
                const isFull = remainCount <= 0;

                const label = document.createElement('label');
                label.className = `time-item ${isFull ? 'disabled' : ''}`;
                
                label.innerHTML = `
                    <input type="radio" name="timeSlot" value="${slot}" ${isFull ? 'disabled' : ''}>
                    <span style="${isFull ? 'color:#dc3545; text-decoration:line-through;' : ''}">
                        ${slot} <br>
                        <small style="color:${isFull ? '#dc3545' : '#28a745'}">
                            (잔여: ${isFull ? '마감' : remainCount + '명'} / 정원: ${rule.capacity}명)
                        </small>
                    </span>
                `;
                timeListContainer.appendChild(label);
            });

        } catch (error) {
            timeListContainer.innerHTML = '<p style="color:red; text-align:center;">데이터를 불러오는 데 실패했습니다.</p>';
            renderDefaultTimeSlots(selectedLocation); 
        }
    }

    renderCalendar(currentYear, currentMonth);
    renderDefaultTimeSlots(selectedLocation);

    // === 인원수 증감 및 폼 제출 ===
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const peopleInput = document.getElementById('people');
    if(btnMinus && btnPlus) {
        btnMinus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val > 1) peopleInput.value = val - 1; });
        btnPlus.addEventListener('click', () => { let val = parseInt(peopleInput.value); if (val < 5) peopleInput.value = val + 1; });
    }

    const reserveForm = document.getElementById('reserveForm');
    if (reserveForm) {
        reserveForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!hiddenDateInput.value) return alert('달력에서 예약 날짜를 선택해주세요.');
            const timeSlot = document.querySelector('input[name="timeSlot"]:checked');
            if (!timeSlot) return alert('예약 시간을 선택해주세요.');
            
            // ⭐️ 과천 시민 검증 로직 추가 ⭐️
            const address1 = document.getElementById('address1').value;
            if (!address1.includes('과천')) {
                alert('죄송합니다. 과천 물놀이장은 과천 시민만 예약이 가능합니다.\n올바른 과천시 주소를 입력해 주세요.');
                return; // 여기서 더 이상 진행하지 않고 막습니다.
            }

            const agree = document.getElementById('privacyAgree');
            if (!agree.checked) return alert('개인정보 수집 및 이용에 동의해주세요.');

            const submitBtn = reserveForm.querySelector('.submit-btn');
            submitBtn.textContent = '예약 처리 중...';
            submitBtn.disabled = true;

            const email = `${document.getElementById('email1').value}@${document.getElementById('email2').value}`;
            const phone = `${document.getElementById('phone1').value}-${document.getElementById('phone2').value}-${document.getElementById('phone3').value}`;
            const birthdate = `${document.getElementById('birthYear').value}-${document.getElementById('birthMonth').value}-${document.getElementById('birthDay').value}`;
            const address = `[${document.getElementById('postcode').value}] ${document.getElementById('address1').value} ${document.getElementById('address2').value}`;

            const data = {
                location: selectedLocation,
                name: document.getElementById('name').value,
                phone: phone,
                people: parseInt(peopleInput.value),
                date: hiddenDateInput.value,
                time_slot: timeSlot.value,
                email: email,
                birthdate: birthdate,
                address: address
            };

            try {
                const response = await fetch(`${API_BASE}/api/reserve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json(); 
                
                if (response.ok && result.success) {
                    const formContainer = reserveForm.parentElement;
                    formContainer.innerHTML = `
                        <div style="text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #ddd; margin-top: 1rem;">
                            <h3 style="color: #28a745; margin-bottom: 1rem;">🎉 예약이 성공적으로 접수되었습니다!</h3>
                            <p style="color: #666; margin-bottom: 1rem;">추후 예약 조회/취소 시 필요하오니 아래 예약 번호를 반드시 복사해 두세요.</p>
                            
                            <div style="margin: 1.5rem auto; padding: 1rem; background: #fff; border: 2px dashed #0056b3; font-size: 1.8rem; font-weight: bold; color: #0056b3; width: 80%; letter-spacing: 2px;">
                                ${result.reservation_code}
                            </div>
                            
                            <button type="button" onclick="navigator.clipboard.writeText('${result.reservation_code}').then(() => alert('예약 번호가 복사되었습니다!'))" class="btn-black" style="padding: 10px 20px; font-size: 1rem; margin-bottom: 1.5rem; cursor: pointer;">
                                📋 예약 번호 복사하기
                            </button>
                            <br>
                            <button type="button" onclick="location.reload()" class="submit-btn" style="width: auto; padding: 10px 30px;">확인 (초기화)</button>
                        </div>
                    `;
                    formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

                } else {
                    alert(`예약 처리 중 오류가 발생했습니다: ${result.message || result.error || '알 수 없는 오류'}`);
                    submitBtn.textContent = '예약 신청하기';
                    submitBtn.disabled = false;
                }
            } catch (error) {
                alert('네트워크 오류가 발생했습니다.');
                submitBtn.textContent = '예약 신청하기';
                submitBtn.disabled = false;
            }
        });
    }
});

function execDaumPostcode() {
    new daum.Postcode({
        oncomplete: function(data) {
            document.getElementById('postcode').value = data.zonecode;
            document.getElementById('address1').value = data.address;
            document.getElementById('address2').focus();
        }
    }).open();
}
