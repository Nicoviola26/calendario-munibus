document.addEventListener('DOMContentLoaded', () => {
    // Role Buttons Toggle
    const roleBtns = document.querySelectorAll('.role-btn');
    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            roleBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked
            btn.classList.add('active');
            
            // Visual feedback - dynamic update based on role
            const role = btn.dataset.role;
            console.log(`Switched to role: ${role}`);
            
            // If admin, maybe change some labels (optional enhancement)
            const subtitle = document.querySelector('.welcome-section p');
            if (role === 'admin') {
                subtitle.textContent = 'Ingrese sus credenciales de administrador.';
            } else {
                subtitle.textContent = 'Ingrese sus credenciales para acceder al portal.';
            }
        });
    });

    // Password Toggle Logic
    const togglePassBtn = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    if (togglePassBtn && passwordInput) {
        const eyeIcon = togglePassBtn.querySelector('i');
        togglePassBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Update Lucide SVG manually since it won't re-render automatically
            if (type === 'text') {
                eyeIcon.setAttribute('data-lucide', 'eye-off');
            } else {
                eyeIcon.setAttribute('data-lucide', 'eye');
            }
            lucide.createIcons();
        });
    }

    // Form Submission Feedback
    const loginForm = document.querySelector('.login-form');
    const submitBtn = document.querySelector('.submit-btn');

    if (loginForm && submitBtn) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state
            const originalContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loader"></span> Iniciando...';
        
        // Add minimal CSS for loader if not present
        if (!document.getElementById('loader-style')) {
            const style = document.createElement('style');
            style.id = 'loader-style';
            style.textContent = `
                .loader {
                    width: 16px;
                    height: 16px;
                    border: 2px solid white;
                    border-bottom-color: transparent;
                    border-radius: 50%;
                    display: inline-block;
                    animation: rotation 1s linear infinite;
                }
                @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }

            const userInput = document.getElementById('email');
            const activeRole = document.querySelector('.role-btn.active').dataset.role;

            try {
                if (activeRole === 'admin') {
                    const response = await fetch('/api/auth/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: userInput?.value?.trim(),
                            password: passwordInput?.value
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Credenciales inválidas');
                    }
                    window.location.href = 'admin-dashboard.html';
                    return;
                }

                // Usuario general: acceso sin validación estricta por ahora.
                window.location.href = 'dashboard.html';
            } catch (_error) {
                alert('Usuario o contraseña incorrectos.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
        });
    }

    // --- Dashboard / Admin Share Logic ---
    const monthDisplay = document.querySelector('#current-month');
    if (monthDisplay) {
        let currentDate = new Date(); // Start at the current date
        
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar(currentDate);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar(currentDate);
            });
        }

        // --- Admin Data & Functions ---
        let places = [
            { id: 1, name: "Museo Histórico Provincial" },
            { id: 2, name: "Palacio Municipal" },
            { id: 3, name: "Puerto de Santa Fe" },
            { id: 4, name: "Manzana de las Luces" },
            { id: 5, name: "Teatro Municipal" }
        ];
        let allVisits = {
            "2026-4-3": [{ school: "Colegio Inmaculada", students: 45, time: "09:00", place: "Palacio Municipal" }],
            "2026-4-5": [{ school: "Escuela Normal N° 32", students: 30, time: "10:30", place: "Museo Histórico" }],
            "2026-4-11": [{ school: "Instituto Sol", students: 22, time: "14:00", place: "Puerto de Santa Fe" }],
            "2026-4-17": [
                { school: "Escuela Técnica N° 4", students: 35, time: "08:30", place: "Museo del Puerto" },
                { school: "Colegio San José", students: 28, time: "11:00", place: "Teatro Municipal" }
            ],
            "2026-4-22": [{ school: "Escuela Manuel Belgrano", students: 40, time: "09:30", place: "Palacio Municipal" }]
        };

        let selectedDateForVisit = null;

        const getDateKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        const normalizeVisitsFromApi = (visitsRows) => {
            const normalized = {};
            visitsRows.forEach((visit) => {
                const visitDate = new Date(visit.visit_date);
                const key = getDateKey(visitDate);
                if (!normalized[key]) normalized[key] = [];
                normalized[key].push({
                    school: visit.school_name,
                    students: visit.students_count,
                    time: String(visit.visit_time).slice(0, 5),
                    place: visit.place_name
                });
            });
            return normalized;
        };

        const loadRemoteData = async () => {
            try {
                const [placesRes, visitsRes] = await Promise.all([
                    fetch("/api/places"),
                    fetch("/api/visits")
                ]);

                if (placesRes.ok) {
                    places = await placesRes.json();
                }

                if (visitsRes.ok) {
                    const visitsRows = await visitsRes.json();
                    allVisits = normalizeVisitsFromApi(visitsRows);
                }
            } catch (error) {
                console.warn("No se pudo conectar con la API. Se usan datos locales.", error);
            }
        };

        const renderPlaces = () => {
            const placesContainer = document.querySelector('.places-list');
            const placeSelect = document.getElementById('visit-place');
            const docVisibilitySelect = document.getElementById('doc-visibility-select');
            
            if (placesContainer) {
                placesContainer.innerHTML = '';
                places.forEach((place, index) => {
                    const item = document.createElement('div');
                    item.className = 'place-item';
                    item.style.display = 'flex';
                    item.style.justifyContent = 'space-between';
                    item.style.alignItems = 'center';
                    item.style.padding = '12px';
                    item.style.borderBottom = '1px solid var(--border-color)';
                    item.innerHTML = `
                        <span>${place.name}</span>
                    `;
                    placesContainer.appendChild(item);
                });
            }

            if (placeSelect) {
                const currentValue = placeSelect.value;
                placeSelect.innerHTML = '<option value="">Seleccionar Lugar...</option>';
                places.forEach(place => {
                    const option = document.createElement('option');
                    option.value = String(place.id);
                    option.textContent = place.name;
                    placeSelect.appendChild(option);
                });
                placeSelect.value = currentValue;
            }

            if (docVisibilitySelect) {
                const currentValue = docVisibilitySelect.value;
                docVisibilitySelect.innerHTML = `
                    <option value="todos">TODOS</option>
                    <option value="admins">SOLO ADMINS</option>
                `;
                places.forEach(place => {
                    const option = document.createElement('option');
                    option.value = String(place.id);
                    option.textContent = `SOLO ${place.name.toUpperCase()}`;
                    docVisibilitySelect.appendChild(option);
                });
                docVisibilitySelect.value = currentValue;
            }
            lucide.createIcons();
        };
        const renderCalendar = (date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            monthDisplay.textContent = `${monthNames[month]} ${year}`;
            
            const grid = document.getElementById('calendar-grid');
            const dayNames = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
            
            grid.innerHTML = '';
            
            // Add Day Names
            dayNames.forEach(day => {
                const dayNameEl = document.createElement('div');
                dayNameEl.className = 'day-name';
                dayNameEl.textContent = day;
                grid.appendChild(dayNameEl);
            });
            
            let firstDay = new Date(year, month, 1).getDay(); 
            firstDay = firstDay === 0 ? 6 : firstDay - 1;
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthDays = new Date(year, month, 0).getDate();
            
            for (let i = firstDay; i > 0; i--) {
                const dayEl = document.createElement('div');
                dayEl.className = 'day prev-month';
                dayEl.textContent = prevMonthDays - i + 1;
                grid.appendChild(dayEl);
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'day';
                dayEl.textContent = i;
                
                const dateKey = `${year}-${month + 1}-${i}`;
                if (allVisits[dateKey]) {
                    dayEl.classList.add('has-event', allVisits[dateKey].length > 1 ? 'red' : 'blue');
                }
                
                const today = new Date();
                if (month === today.getMonth() && year === today.getFullYear() && i === today.getDate()) {
                    dayEl.classList.add('active');
                }

                // Click event for day details
                dayEl.addEventListener('click', () => showDayDetails(i, month, year));
                
                grid.appendChild(dayEl);
            }
            lucide.createIcons();
        };

        const showDayDetails = (day, month, year) => {
            const modal = document.getElementById('modal-dia-detalle');
            const container = document.getElementById('day-visits-container');
            const noVisits = document.getElementById('no-visits-msg');
            const title = document.getElementById('modal-date-title');
            
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            title.textContent = `${day} de ${monthNames[month]} ${year}`;
            
            const dateKey = `${year}-${month + 1}-${day}`;
            selectedDateForVisit = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayVisits = allVisits[dateKey] || [];
            
            container.innerHTML = '';
            if (dayVisits.length > 0) {
                noVisits.style.display = 'none';
                dayVisits.forEach(visit => {
                    const item = document.createElement('div');
                    item.style.background = 'var(--input-bg)';
                    item.style.padding = '16px';
                    item.style.borderRadius = '12px';
                    item.style.marginBottom = '12px';
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: var(--accent-blue);">${visit.school}</span>
                            <span style="font-size: 11px; padding: 2px 8px; background: white; border-radius: 99px; font-weight: 600;">${visit.time} HS</span>
                        </div>
                        <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary);">
                            <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="map-pin" style="width: 14px;"></i> ${visit.place}</span>
                            <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="users" style="width: 14px;"></i> ${visit.students} alumnos</span>
                        </div>
                    `;
                    container.appendChild(item);
                });
            } else {
                noVisits.style.display = 'block';
            }
            
            modal.classList.add('active');
            lucide.createIcons();
        };

        // Add Place Logic
        const addPlaceInput = document.getElementById('new-place-name');
        const addPlaceBtn = document.getElementById('btn-add-place');

        if (addPlaceBtn && addPlaceInput) {
            addPlaceBtn.addEventListener('click', async () => {
                const newPlace = addPlaceInput.value.trim();
                if (!newPlace) return;
                if (places.some((p) => p.name.toLowerCase() === newPlace.toLowerCase())) return;

                try {
                    const response = await fetch("/api/places", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newPlace })
                    });

                    if (!response.ok) {
                        throw new Error("No se pudo crear el lugar");
                    }

                    const createdPlace = await response.json();
                    places.push(createdPlace);
                    addPlaceInput.value = '';
                    renderPlaces();
                } catch (error) {
                    alert("No se pudo guardar el lugar en la base de datos.");
                }
            });
        }

        // Initial render
        (async () => {
            await loadRemoteData();
            renderCalendar(currentDate);
            renderPlaces();
        })();

        // --- Admin Modal Logic ---
        const btnResumenDia = document.getElementById('btn-resumen-dia');
        const btnNuevaVisita = document.getElementById('btn-nueva-visita');
        const btnGestionarLugares = document.getElementById('btn-gestionar-lugares');
        const btnConfiguracion = document.getElementById('btn-configuracion');
        const btnDocumentos = document.getElementById('btn-documentos');
        
        const modalAgregar = document.getElementById('modal-agregar');
        const modalLugares = document.getElementById('modal-lugares');
        const modalConfiguracion = document.getElementById('modal-configuracion');
        const modalDocumentos = document.getElementById('modal-documentos');
        const modalDiaDetalle = document.getElementById('modal-dia-detalle');
        
        const closeButtons = document.querySelectorAll('.close-modal');
        const formVisita = document.getElementById('form-visita');

        // Resumen del Día - Link to Today
        if (btnResumenDia) {
            btnResumenDia.addEventListener('click', () => {
                const today = new Date();
                showDayDetails(today.getDate(), today.getMonth(), today.getFullYear());
            });
        }

        // Toggle Nueva Visita
        if (btnNuevaVisita && modalAgregar) {
            btnNuevaVisita.addEventListener('click', () => modalAgregar.classList.add('active'));
        }

        // Bridge to add visit from Day Detail
        const btnAddFromDay = document.querySelector('.id-btn-nueva-visita-from-day');
        if (btnAddFromDay && modalAgregar && modalDiaDetalle) {
            btnAddFromDay.addEventListener('click', () => {
                modalDiaDetalle.classList.remove('active');
                modalAgregar.classList.add('active');
                const visitDateInput = document.getElementById('visit-date');
                if (visitDateInput && selectedDateForVisit) {
                    visitDateInput.value = selectedDateForVisit;
                }
            });
        }

        // Toggle Gestionar Lugares
        if (btnGestionarLugares && modalLugares) {
            btnGestionarLugares.addEventListener('click', () => modalLugares.classList.add('active'));
        }

        // Toggle Configuración
        if (btnConfiguracion && modalConfiguracion) {
            btnConfiguracion.addEventListener('click', () => modalConfiguracion.classList.add('active'));
        }

        // Toggle Documentos
        if (btnDocumentos && modalDocumentos) {
            btnDocumentos.addEventListener('click', () => modalDocumentos.classList.add('active'));
        }

        // Shared close logic for all modals
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modalAgregar?.classList.remove('active');
                modalLugares?.classList.remove('active');
                modalConfiguracion?.classList.remove('active');
                modalDocumentos?.classList.remove('active');
                modalDiaDetalle?.classList.remove('active');
            });
        });

        // Close on overlay click
        window.addEventListener('click', (e) => {
            if (e.target === modalAgregar) modalAgregar.classList.remove('active');
            if (e.target === modalLugares) modalLugares.classList.remove('active');
            if (e.target === modalConfiguracion) modalConfiguracion.classList.remove('active');
            if (e.target === modalDocumentos) modalDocumentos.classList.remove('active');
            if (e.target === modalDiaDetalle) modalDiaDetalle.classList.remove('active');
        });

        // Upload Document Logic
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.getElementById('input-upload-doc');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const visibility = document.getElementById('doc-visibility-select').value.toUpperCase();
                    alert('¡Documento "' + e.target.files[0].name + '" subido con éxito!\nVisibilidad configurada para: ' + visibility);
                    // In a real app, we would append to the list here
                }
            });
        }

        // Save Config Logic
        const btnSaveConfig = document.getElementById('btn-save-config');
        const configUserName = document.getElementById('config-user-name');
        const configUserImgFile = document.getElementById('config-user-img-file');
        const btnTriggerImg = document.getElementById('btn-trigger-img');
        const headerUserName = document.getElementById('header-user-name');
        const headerUserImg = document.getElementById('header-user-img');
        const configImgPreview = document.getElementById('config-img-preview');

        let pendingImageData = null;

        if (btnTriggerImg && configUserImgFile) {
            btnTriggerImg.addEventListener('click', () => configUserImgFile.click());
            
            configUserImgFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        pendingImageData = event.target.result;
                        if (configImgPreview) configImgPreview.src = pendingImageData;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', () => {
                if (headerUserName && configUserName) {
                    headerUserName.textContent = configUserName.value;
                }
                if (headerUserImg && pendingImageData) {
                    headerUserImg.src = pendingImageData;
                }
                alert('¡Configuración guardada correctamente!');
                modalConfiguracion.classList.remove('active');
            });
        }

        if (formVisita) {
            formVisita.addEventListener('submit', async (e) => {
                e.preventDefault();
                const schoolInput = document.getElementById('visit-school');
                const dateInput = document.getElementById('visit-date');
                const timeInput = document.getElementById('visit-time');
                const placeInput = document.getElementById('visit-place');
                const studentsInput = document.getElementById('visit-students');

                const payload = {
                    school_name: schoolInput?.value?.trim(),
                    visit_date: dateInput?.value,
                    visit_time: timeInput?.value,
                    place_id: Number(placeInput?.value),
                    students_count: Number(studentsInput?.value)
                };

                try {
                    const response = await fetch("/api/visits", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error("No se pudo guardar la visita");
                    }

                    const createdVisit = await response.json();
                    const visitDate = new Date(createdVisit.visit_date);
                    const dateKey = getDateKey(visitDate);
                    const placeName = places.find((p) => p.id === createdVisit.place_id)?.name || "Lugar";

                    if (!allVisits[dateKey]) allVisits[dateKey] = [];
                    allVisits[dateKey].push({
                        school: createdVisit.school_name,
                        students: createdVisit.students_count,
                        time: String(createdVisit.visit_time).slice(0, 5),
                        place: placeName
                    });

                    renderCalendar(currentDate);
                    alert('¡Visita programada con éxito!');
                    modalAgregar.classList.remove('active');
                    formVisita.reset();
                } catch (error) {
                    alert('No se pudo guardar la visita en la base de datos.');
                }
            });
        }
    }
});
