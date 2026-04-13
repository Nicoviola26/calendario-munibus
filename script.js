console.log("Script MuniBus Iniciado");
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado");

    const STORAGE_KEYS = {
        places: "munibus_places",
        profiles: "munibus_profiles",
        activeProfile: "munibus_active_profile",
        users: "munibus_users",
    };
    const PLACE_COLOR_PALETTE = [
        "#1171ba", "#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981",
    ];
    const readStorageJSON = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_error) {
            return fallback;
        }
    };
    const writeStorageJSON = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };
    const normalizeHexColor = (value, fallback = "#1171ba") => {
        const color = String(value || "").trim();
        return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
    };
    const defaultPlaceColor = (index) => PLACE_COLOR_PALETTE[index % PLACE_COLOR_PALETTE.length];
    
    // --- Custom Popup System Utility ---
    const showModal = ({ title, message, type = 'success', confirm = false, input = false, inputValue = '', inputType = 'text' }) => {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'popup-overlay';
            
            const iconMap = {
                success: 'check-circle',
                error: 'alert-circle',
                confirm: 'help-circle'
            };
            
            overlay.innerHTML = `
                <div class="popup-card">
                    <div class="popup-icon ${type}">
                        <i data-lucide="${iconMap[type] || 'info'}"></i>
                    </div>
                    <h3 class="popup-title">${title}</h3>
                    <p class="popup-message" style="margin-bottom: ${input ? '16px' : '28px'}">${message}</p>
                    ${input ? `
                        <div style="margin-bottom: 24px;">
                            <input type="${inputType}" id="popup-input" value="${inputValue}" 
                                style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid var(--border-color); 
                                font-family: inherit; font-size: 15px; box-sizing: border-box; outline: none; transition: border-color 0.2s;"
                                onfocus="this.style.borderColor='var(--primary-blue)'"
                                onblur="this.style.borderColor='var(--border-color)'">
                        </div>
                    ` : ''}
                    <div class="popup-actions">
                        ${(confirm || input) ? '<button class="popup-btn popup-btn-secondary" id="popup-cancel">Cancelar</button>' : ''}
                        <button class="popup-btn popup-btn-primary" id="popup-ok">${(confirm || input) ? 'Confirmar' : 'Entendido'}</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            if (window.lucide) lucide.createIcons();
            
            const inputField = overlay.querySelector('#popup-input');
            if (inputField) {
                setTimeout(() => inputField.focus(), 100);
                inputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') overlay.querySelector('#popup-ok').click();
                });
            }
            
            // Tiny delay for CSS transition
            setTimeout(() => overlay.classList.add('active'), 10);
            
            const close = () => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (overlay.parentNode) document.body.removeChild(overlay);
                }, 300);
            };
            
            overlay.querySelector('#popup-ok').addEventListener('click', () => {
                const result = input ? (inputField ? inputField.value : '') : true;
                resolve(result);
                close();
            });

            const cancelBtn = overlay.querySelector('#popup-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    resolve(null);
                    close();
                });
            }
            
            // Close on overlay click (if not confirm/input)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && !confirm && !input) {
                    resolve(true);
                    close();
                }
            });
        });
    };

    // --- Logout & Session Logic ---
    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.activeProfile);
        window.location.href = 'index.html';
    };

    const logoutButtons = [
        'btn-logout',
        'btn-logout-dropdown',
        'btn-logout-config'
    ];

    logoutButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', handleLogout);
    });

    // Profile Dropdown Toggle
    const profileToggle = document.getElementById('profile-toggle');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileToggle && profileDropdown) {
        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
            // Animate chevron
            const chevron = profileToggle.querySelector('.chevron-icon');
            if (chevron) {
                chevron.style.transform = profileDropdown.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });

        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
            const chevron = profileToggle.querySelector('.chevron-icon');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        });
    }

    // Populate User Info from Session
    const activeProfile = readStorageJSON(STORAGE_KEYS.activeProfile, null);
    if (activeProfile) {
        const headerUserName = document.getElementById('header-user-name');
        const headerUserRole = document.getElementById('header-user-role');
        const dropdownUserName = document.getElementById('dropdown-user-name');
        const dropdownUserRole = document.getElementById('dropdown-user-role');
        const configUserName = document.getElementById('config-user-name');

        const userName = activeProfile.name || activeProfile.username || "Usuario";
        const userRole = activeProfile.placeName || (activeProfile.role === 'admin' ? 'Administrador' : 'Institución');

        if (headerUserName) headerUserName.textContent = userName;
        if (headerUserRole) headerUserRole.textContent = userRole;
        if (dropdownUserName) dropdownUserName.textContent = userName;
        if (dropdownUserRole) dropdownUserRole.textContent = userRole;
        if (configUserName) configUserName.value = userName;
    }

    // Dropdown Config Shortcut
    const btnConfigShortcut = document.getElementById('btn-config-shortcut');
    const modalConfiguracionX = document.getElementById('modal-configuracion');
    if (btnConfigShortcut && modalConfiguracionX) {
        btnConfigShortcut.addEventListener('click', () => {
            modalConfiguracionX.classList.add('active');
        });
    }
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

    // --- LOGIN HANDLER (Maximum Robustness) ---
    const loginForm = document.getElementById('main-login-form');
    const submitBtn = document.getElementById('btn-entrar');

    const performLogin = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log("Login attempt initiated...");
        
        if (!submitBtn) return;
        const originalContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Iniciando...';

        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const loginValue = emailInput?.value?.trim();
        const loginPassword = passInput?.value;

        try {
            // 0. Demo Fallback (For static preview)
            if (loginValue === 'admin' && loginPassword === 'admin') {
                writeStorageJSON(STORAGE_KEYS.activeProfile, {
                    id: 99,
                    name: "Administrador Demo",
                    email: "admin@munibus.gob.ar",
                    role: 'admin'
                });
                window.location.href = 'admin-dashboard.html';
                return;
            }

            // 1. Admin Login
            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginValue, password: loginPassword })
            });

            if (response.ok) {
                const payload = await response.json();
                writeStorageJSON(STORAGE_KEYS.activeProfile, {
                    id: payload.user.id || 0,
                    name: payload.user.full_name || "Administrador",
                    email: payload.user.email,
                    role: 'admin'
                });
                window.location.href = 'admin-dashboard.html';
                return;
            }

            // 2. User Login
            const userRes = await fetch('/api/auth/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginValue, password: loginPassword })
            });

            if (userRes.ok) {
                const payload = await userRes.json();
                const userData = payload.user;
                if (userData.place_id) userData.placeId = Number(userData.place_id);
                writeStorageJSON(STORAGE_KEYS.activeProfile, {
                    ...userData,
                    name: userData.full_name || userData.username,
                });
                window.location.href = 'dashboard.html';
                return;
            }

            // 3. Local Fallback
            const localUsers = readStorageJSON(STORAGE_KEYS.users, []);
            const localUser = localUsers.find(u => 
                String(u.username || "").toLowerCase() === String(loginValue || "").toLowerCase() && 
                String(u.password || "") === String(loginPassword || "")
            );
            
            if (localUser) {
                if (localUser.place_id) localUser.placeId = Number(localUser.place_id);
                writeStorageJSON(STORAGE_KEYS.activeProfile, {
                    ...localUser,
                    name: localUser.full_name || localUser.username,
                });
                window.location.href = 'dashboard.html';
                return;
            }

            throw new Error("Credenciales inválidas");
        } catch (err) {
            console.error("Login failure:", err);
            await showModal({
                title: 'Error de Acceso',
                message: 'Usuario o contraseña incorrectos. Por favor, verificá tus datos.',
                type: 'error'
            });
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    };

    if (loginForm) {
        loginForm.onsubmit = performLogin;
    }
    if (submitBtn) {
        submitBtn.onclick = performLogin;
    }

    // --- Global State ---
    let currentDate = new Date();
    let allVisits = {
        "2026-4-3": [{ school: "Colegio Inmaculada", students: 45, time: "09:00", place: "Palacio Municipal", placeId: 2 }],
        "2026-4-5": [{ school: "Escuela Normal N° 32", students: 30, time: "10:30", place: "Museo Histórico", placeId: 1 }],
        "2026-4-11": [{ school: "Instituto Sol", students: 22, time: "14:00", place: "Puerto de Santa Fe", placeId: 3 }],
        "2026-4-17": [
            { school: "Escuela Técnica N° 4", students: 35, time: "08:30", place: "Museo del Puerto", placeId: 3 },
            { school: "Colegio San José", students: 28, time: "11:00", place: "Teatro Municipal", placeId: 5 }
        ],
        "2026-4-22": [{ school: "Escuela Manuel Belgrano", students: 40, time: "09:30", place: "Palacio Municipal", placeId: 2 }]
    };
    let selectedDateForVisit = "";
    let places = [
        { id: 1, name: "Museo Histórico Provincial", color: "#1171ba" },
        { id: 2, name: "Palacio Municipal", color: "#6366f1" },
        { id: 3, name: "Puerto de Santa Fe", color: "#0ea5e9" },
        { id: 4, name: "Manzana de las Luces", color: "#14b8a6" },
        { id: 5, name: "Teatro Municipal", color: "#f59e0b" },
    ];
    let managedUsers = [];
    let profiles = [
        { name: "Perfil Norte", placeId: 1 },
        { name: "Perfil Centro", placeId: 2 }
    ];
    // --- Dashboard / Admin Share Logic ---
    const monthDisplay = document.getElementById('current-month');
    
    // Update Today's Assignment Date
    const assignmentDateEl = document.querySelector('.assignment-date');
    if (assignmentDateEl) {
        const today = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'short' };
        let dateStr = today.toLocaleDateString('es-ES', options);
        dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        assignmentDateEl.textContent = dateStr;
    }

    if (monthDisplay) {
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
                    place: visit.place_name,
                    placeId: Number(visit.place_id)
                });
            });
            return normalized;
        };

        const getPlaceById = (placeId) =>
            places.find((p) => Number(p.id) === Number(placeId));

        const getPlaceColor = (placeId) =>
            normalizeHexColor(getPlaceById(placeId)?.color, "#1171ba");

        const savePlacesToStorage = () => writeStorageJSON(STORAGE_KEYS.places, places);
        const saveProfilesToStorage = () => writeStorageJSON(STORAGE_KEYS.profiles, profiles);

        const normalizePlacesWithStorage = (sourcePlaces) => {
            const storedPlaces = readStorageJSON(STORAGE_KEYS.places, []);
            return sourcePlaces.map((place, index) => {
                const saved = storedPlaces.find((s) => Number(s.id) === Number(place.id)) || {};
                return {
                    ...place,
                    color: normalizeHexColor(saved.color, place.color || defaultPlaceColor(index)),
                };
            });
        };

        const loadRemoteData = async () => {

            try {
                const [placesRes, visitsRes, usersRes] = await Promise.all([
                    fetch("/api/places"),
                    fetch("/api/visits"),
                    fetch("/api/users")
                ]);

                if (placesRes.ok) {
                    places = normalizePlacesWithStorage(await placesRes.json());
                } else {
                    places = normalizePlacesWithStorage(places);
                }

                if (visitsRes.ok) {
                    const visitsRows = await visitsRes.json();
                    allVisits = normalizeVisitsFromApi(visitsRows);
                }
                if (usersRes.ok) {
                    managedUsers = await usersRes.json();
                    saveUsersToStorage();
                } else {
                    managedUsers = readStorageJSON(STORAGE_KEYS.users, []);
                }
            } catch (error) {
                console.warn("No se pudo conectar con la API. Se usan datos locales.", error);
                places = normalizePlacesWithStorage(places);
                managedUsers = readStorageJSON(STORAGE_KEYS.users, []);
            }
            savePlacesToStorage();
        };

        let editingUserIndex = null;
        let deletingUserIndex = null;
        const storedProfiles = readStorageJSON(STORAGE_KEYS.profiles, []);
        if (storedProfiles.length) {
            profiles = storedProfiles;
        } else {
            saveProfilesToStorage();
        }

        const saveUsersToStorage = () => writeStorageJSON(STORAGE_KEYS.users, managedUsers);
        const showUsersFeedback = (message, type = "error") => {
            const feedback = document.getElementById("users-feedback");
            if (!feedback) return;
            feedback.style.display = "block";
            feedback.textContent = message;
            feedback.style.background = type === "success" ? "#dcfce7" : "#fee2e2";
            feedback.style.color = type === "success" ? "#166534" : "#991b1b";
            feedback.style.border = `1px solid ${type === "success" ? "#86efac" : "#fecaca"}`;
        };

        const renderProfiles = () => {
            const profilesContainer = document.getElementById('profiles-list');
            const profilePlaceSelect = document.getElementById('new-profile-place');

            if (profilesContainer) {
                profilesContainer.innerHTML = '';

                if (!profiles.length) {
                    const empty = document.createElement('div');
                    empty.style.padding = '12px';
                    empty.style.color = 'var(--text-secondary)';
                    empty.textContent = 'Todavía no hay perfiles cargados.';
                    profilesContainer.appendChild(empty);
                }

                profiles.forEach((profile, index) => {
                    const assignedPlace = getPlaceById(profile.placeId);
                    const assignedColor = getPlaceColor(profile.placeId);
                    const item = document.createElement('div');
                    item.className = 'place-item';
                    item.style.display = 'flex';
                    item.style.justifyContent = 'space-between';
                    item.style.alignItems = 'center';
                    item.style.padding = '12px';
                    item.style.borderBottom = '1px solid var(--border-color)';
                    item.innerHTML = `
                        <div>
                            <div style="font-weight: 600;">${profile.name}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                Lugar asignado: ${assignedPlace ? assignedPlace.name : 'Sin asignar'}
                            </div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; display: inline-flex; align-items: center; gap: 6px;">
                                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${assignedColor}; display: inline-block;"></span>
                                Color del lugar
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button type="button" class="btn-edit-profile" data-profile-index="${index}" style="background: none; border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; border-radius: 8px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
                                <i data-lucide="pencil" style="width: 16px;"></i>
                            </button>
                            <button type="button" class="btn-delete-profile" data-profile-index="${index}" style="background: none; border: 1px solid rgba(225,29,72,0.3); color: #e11d48; cursor: pointer; border-radius: 8px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
                                <i data-lucide="trash-2" style="width: 16px;"></i>
                            </button>
                        </div>
                    `;
                    profilesContainer.appendChild(item);
                });
            }

            if (profilePlaceSelect) {
                const currentValue = profilePlaceSelect.value;
                profilePlaceSelect.innerHTML = '<option value="">Seleccionar Lugar...</option>';
                places.forEach((place) => {
                    const option = document.createElement('option');
                    option.value = String(place.id);
                    option.textContent = place.name;
                    profilePlaceSelect.appendChild(option);
                });
                profilePlaceSelect.value = currentValue;
            }

            if (profilesContainer) {
                profilesContainer.querySelectorAll('.btn-delete-profile').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const index = Number(btn.dataset.profileIndex);
                        if (!Number.isInteger(index) || !profiles[index]) return;
                        
                        const confirmDelete = await showModal({
                            title: 'Eliminar Perfil',
                            message: `¿Estás seguro que querés eliminar el perfil "${profiles[index].name}"?`,
                            type: 'confirm',
                            confirm: true
                        });
                        
                        if (!confirmDelete) return;
                        profiles.splice(index, 1);
                        saveProfilesToStorage();
                        renderProfiles();
                        lucide.createIcons();
                    });
                });

                profilesContainer.querySelectorAll('.btn-edit-profile').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const index = Number(btn.dataset.profileIndex);
                        const current = profiles[index];
                        if (!Number.isInteger(index) || !current) return;

                        const newName = await showModal({
                            title: 'Editar Perfil',
                            message: 'Ingresá el nuevo nombre para este perfil:',
                            input: true,
                            inputValue: current.name
                        });
                        if (newName === null) return;
                        const normalizedName = newName.trim();
                        if (!normalizedName) {
                            await showModal({
                                title: 'Campo requerido',
                                message: 'El nombre del perfil no puede estar vacío.',
                                type: 'error'
                            });
                            return;
                        }

                        const placesOptions = places
                            .map((p) => `${p.id}: ${p.name}`)
                            .join("<br>");
                        const newPlaceRaw = await showModal({
                            title: 'Asignar Lugar',
                            message: `Ingresá el ID del nuevo lugar:<br><small>${placesOptions}</small>`,
                            input: true,
                            inputValue: String(current.placeId)
                        });
                        if (newPlaceRaw === null) return;
                        const newPlaceId = Number(newPlaceRaw);
                        const placeExists = places.some((p) => Number(p.id) === newPlaceId);
                        if (!placeExists) {
                            await showModal({
                                title: 'Lugar no válido',
                                message: 'El ID de lugar ingresado no es correcto.',
                                type: 'error'
                            });
                            return;
                        }

                        profiles[index] = {
                            ...current,
                            name: normalizedName,
                            placeId: newPlaceId
                        };
                        saveProfilesToStorage();
                        renderProfiles();
                        lucide.createIcons();
                    });
                });
            }
        };

        const renderPlacesAdmin = () => {
            const placesAdminContainer = document.getElementById('places-admin-list');
            if (!placesAdminContainer) return;

            placesAdminContainer.innerHTML = '';
            if (!places.length) {
                const empty = document.createElement('div');
                empty.style.padding = '12px';
                empty.style.color = 'var(--text-secondary)';
                empty.textContent = 'No hay lugares cargados.';
                placesAdminContainer.appendChild(empty);
                return;
            }

            places.forEach((place, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '10px 8px';
                row.style.borderBottom = '1px solid var(--border-color)';
                
                const placeImgHtml = place.image_url 
                    ? `<img src="${place.image_url}" style="width: 24px; height: 24px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color);">`
                    : `<div style="width: 24px; height: 24px; border-radius: 6px; background: var(--input-bg); display: flex; align-items: center; justify-content: center;"><i data-lucide="image" style="width: 12px; color: var(--text-secondary);"></i></div>`;

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${placeImgHtml}
                        <span style="font-weight: 500; display: inline-flex; align-items: center; gap: 8px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${normalizeHexColor(place.color, defaultPlaceColor(index))}; display: inline-block;"></span>
                            ${place.name}
                        </span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-edit-place" data-place-index="${index}" style="background: none; border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; border-radius: 8px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;">
                            <i data-lucide="pencil" style="width: 14px;"></i>
                        </button>
                        <button type="button" class="btn-delete-place" data-place-index="${index}" style="background: none; border: 1px solid rgba(225,29,72,0.3); color: #e11d48; cursor: pointer; border-radius: 8px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;">
                            <i data-lucide="trash-2" style="width: 14px;"></i>
                        </button>
                    </div>
                `;
                placesAdminContainer.appendChild(row);
            });

            placesAdminContainer.querySelectorAll('.btn-edit-place').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const index = Number(btn.dataset.placeIndex);
                    const current = places[index];
                    if (!Number.isInteger(index) || !current) return;

                    const modal = document.getElementById('modal-editar-lugar');
                    const form = document.getElementById('form-editar-lugar');
                    const idInput = document.getElementById('edit-place-id');
                    const nameInput = document.getElementById('edit-place-name');
                    const colorInput = document.getElementById('edit-place-color');
                    const preview = document.getElementById('edit-place-img-preview');
                    
                    if (!modal || !form) return;

                    idInput.value = index;
                    nameInput.value = current.name || '';
                    colorInput.value = normalizeHexColor(current.color, "#1171ba");
                    
                    if (preview) {
                        if (current.image_url) {
                            preview.innerHTML = `<img src="${current.image_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        } else {
                            preview.innerHTML = '<i data-lucide="image" style="width: 24px; color: var(--text-secondary);"></i>';
                            lucide.createIcons();
                        }
                    }

                    pendingEditPlaceImageData = current.image_url || null;
                    modal.classList.add('active');
                });
            });

            placesAdminContainer.querySelectorAll('.btn-delete-place').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const index = Number(btn.dataset.placeIndex);
                    const current = places[index];
                    if (!Number.isInteger(index) || !current) return;

                    const inUseByProfile = profiles.some((profile) => Number(profile.placeId) === Number(current.id));
                    if (inUseByProfile) {
                        await showModal({
                            title: 'Acción Bloqueada',
                            message: 'No se puede borrar este lugar porque hay perfiles asignados a él.',
                            type: 'error'
                        });
                        return;
                    }

                    const confirmDelete = await showModal({
                        title: 'Eliminar Lugar',
                        message: `¿Estás seguro que querés eliminar "${current.name}"?`,
                        type: 'confirm',
                        confirm: true
                    });
                    if (!confirmDelete) return;

                    try {
                        const response = await fetch(`/api/places/${current.id}`, { method: "DELETE" });
                        if (!response.ok) {
                            if (response.status === 409) {
                                await showModal({
                                    title: 'Conflicto de Datos',
                                    message: 'No se puede borrar: el lugar tiene visitas programadas asociadas.',
                                    type: 'error'
                                });
                                return;
                            }
                            throw new Error("No se pudo eliminar");
                        }
                    } catch (_error) {
                        // fallback local when API isn't available
                    }

                    places.splice(index, 1);
                    profiles = profiles.filter((profile) => Number(profile.placeId) !== Number(current.id));
                    saveProfilesToStorage();
                    savePlacesToStorage();
                    renderPlaces();
                    lucide.createIcons();
                });
            });
        };

        const renderUsersAdmin = () => {
            const usersContainer = document.getElementById('users-admin-list');
            const newUserPlaceSelect = document.getElementById('new-user-place');
            if (!usersContainer) return;

            usersContainer.innerHTML = '';
            if (!managedUsers.length) {
                const empty = document.createElement('div');
                empty.style.padding = '12px';
                empty.style.color = 'var(--text-secondary)';
                empty.textContent = 'No hay usuarios creados.';
                usersContainer.appendChild(empty);
            } else {
                managedUsers.forEach((user, index) => {
                    const place = getPlaceById(user.place_id || user.placeId);
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.padding = '10px 8px';
                    row.style.borderBottom = '1px solid var(--border-color)';
                    row.innerHTML = `
                        <div>
                            <div style="font-weight: 600;">${user.email || user.username}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                Lugar: ${place?.name || "Sin asignar"}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="btn-edit-user" data-user-index="${index}" style="background: none; border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; border-radius: 8px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;">
                                <i data-lucide="pencil" style="width: 14px;"></i>
                            </button>
                            <button type="button" class="btn-delete-user" data-user-index="${index}" style="background: none; border: 1px solid rgba(225,29,72,0.3); color: #e11d48; cursor: pointer; border-radius: 8px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;">
                                <i data-lucide="trash-2" style="width: 14px;"></i>
                            </button>
                        </div>
                    `;
                    usersContainer.appendChild(row);
                });
            }

            if (newUserPlaceSelect) {
                const currentValue = newUserPlaceSelect.value;
                newUserPlaceSelect.innerHTML = '<option value="">Seleccionar Lugar...</option>';
                places.forEach((place) => {
                    const option = document.createElement('option');
                    option.value = String(place.id);
                    option.textContent = place.name;
                    newUserPlaceSelect.appendChild(option);
                });
                newUserPlaceSelect.value = currentValue;
            }

            usersContainer.querySelectorAll('.btn-delete-user').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const index = Number(btn.dataset.userIndex);
                    const user = managedUsers[index];
                    if (!user) return;
                    deletingUserIndex = index;
                    const text = document.getElementById("delete-user-text");
                    if (text) text.textContent = `¿Seguro que querés eliminar "${user.email || user.username}"?`;
                    document.getElementById("modal-user-delete")?.classList.add("active");
                });
            });

            usersContainer.querySelectorAll('.btn-edit-user').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const index = Number(btn.dataset.userIndex);
                    const user = managedUsers[index];
                    if (!user) return;
                    editingUserIndex = index;
                    const usernameInput = document.getElementById("edit-user-username");
                    const passwordInput = document.getElementById("edit-user-password");
                    const placeSelect = document.getElementById("edit-user-place");
                    const title = document.getElementById("user-editor-title");
                    if (title) title.textContent = "Editar Usuario";
                    if (usernameInput) usernameInput.value = user.email || user.username || "";
                    if (passwordInput) passwordInput.value = "";
                    if (placeSelect) {
                        placeSelect.innerHTML = '<option value="">Seleccionar Lugar...</option>';
                        places.forEach((place) => {
                            const option = document.createElement("option");
                            option.value = String(place.id);
                            option.textContent = place.name;
                            placeSelect.appendChild(option);
                        });
                        placeSelect.value = String(user.place_id || user.placeId || "");
                    }
                    document.getElementById("modal-user-editor")?.classList.add("active");
                });
            });
        };

        const renderPlaces = () => {
            const placeSelect = document.getElementById('visit-place');
            const docVisibilitySelect = document.getElementById('doc-visibility-select');

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
            renderProfiles();
            renderPlacesAdmin();
            renderUsersAdmin();
            lucide.createIcons();
        };
        const renderCalendar = (date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            monthDisplay.textContent = `${monthNames[month]} ${year}`;
            if (!document.body.classList.contains('admin-view')) {
                const contentHeader = document.querySelector('.content-header');
                const activeProfile = readStorageJSON(STORAGE_KEYS.activeProfile, null);
                const assignedPlace = getPlaceById(activeProfile?.placeId);
                if (contentHeader && activeProfile && assignedPlace) {
                    let badge = document.getElementById('profile-place-badge');
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.id = 'profile-place-badge';
                        badge.style.fontSize = '12px';
                        badge.style.color = 'var(--text-secondary)';
                        badge.style.display = 'inline-flex';
                        badge.style.alignItems = 'center';
                        badge.style.gap = '8px';
                        contentHeader.appendChild(badge);
                    }
                    badge.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${getPlaceColor(assignedPlace.id)};display:inline-block;"></span>Perfil: ${activeProfile.name} - ${assignedPlace.name}`;
                }
            }
            
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
                let dayVisits = allVisits[dateKey] || [];
                const isAdminView = document.body.classList.contains('admin-view');
                if (!isAdminView) {
                    const activeProfile = readStorageJSON(STORAGE_KEYS.activeProfile, null);
                    if (activeProfile?.placeId) {
                        dayVisits = dayVisits.filter((visit) => Number(visit.placeId) === Number(activeProfile.placeId));
                    }
                }
                if (dayVisits.length) {
                    dayEl.classList.add('has-event');
                    dayEl.style.setProperty('--event-color', getPlaceColor(dayVisits[0].placeId));
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
            updateMonthlyStats(date);
        };

        const updateMonthlyStats = (date) => {
            const dateToUse = date || currentDate;
            const year = dateToUse.getFullYear();
            const month = dateToUse.getMonth() + 1;
            const monthTotalEl = document.getElementById('stats-month-total');
            const nextVisitEl = document.getElementById('stats-next-visit-desc');
            
            if (!monthTotalEl || !nextVisitEl) return;

            let totalVisits = 0;
            let currentMonthVisits = [];
            
            const activeProfile = readStorageJSON(STORAGE_KEYS.activeProfile, null);
            const isAdminView = document.body.classList.contains('admin-view');

            // Count visits for this month
            for (const [key, visits] of Object.entries(allVisits)) {
                const [vYear, vMonth, vDay] = key.split('-').map(Number);
                if (vYear === year && vMonth === month) {
                    let filteredVisits = visits;
                    if (!isAdminView && activeProfile?.placeId) {
                        filteredVisits = visits.filter(v => Number(v.placeId) === Number(activeProfile.placeId));
                    }
                    totalVisits += filteredVisits.length;
                    filteredVisits.forEach(v => {
                        currentMonthVisits.push({...v, date: key, fullDate: new Date(vYear, vMonth - 1, vDay)});
                    });
                }
            }

            monthTotalEl.textContent = `${totalVisits} Visitas`;

            // Find next visit
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const futureVisits = currentMonthVisits
                .filter(v => v.fullDate >= today)
                .sort((a, b) => a.fullDate - b.fullDate || a.time.localeCompare(b.time));

            if (futureVisits.length > 0) {
                const next = futureVisits[0];
                const [ny, nm, nd] = next.date.split('-');
                nextVisitEl.innerHTML = `<i data-lucide="calendar"></i> Próxima: ${nd}/${nm} - ${next.school}`;
            } else {
                nextVisitEl.innerHTML = `<i data-lucide="calendar"></i> No hay más este mes`;
            }
            lucide.createIcons();
        };

        const openMonthlyReport = () => {
            const modal = document.getElementById('modal-reporte-mensual');
            const body = document.getElementById('monthly-report-body');
            const noData = document.getElementById('no-report-data');
            const tableContainer = document.getElementById('monthly-report-table-container');
            const title = document.getElementById('report-month-title');
            
            if (!modal || !body) return;

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            title.textContent = `${monthNames[month - 1]} ${year}`;
            body.innerHTML = '';
            
            let monthVisits = [];
            for (const [key, visits] of Object.entries(allVisits)) {
                const [vYear, vMonth, vDay] = key.split('-').map(Number);
                if (vYear === year && vMonth === month) {
                    visits.forEach(v => monthVisits.push({...v, day: vDay, dateObj: new Date(vYear, vMonth-1, vDay)}));
                }
            }

            monthVisits.sort((a, b) => a.dateObj - b.dateObj || a.time.localeCompare(b.time));

            if (monthVisits.length > 0) {
                noData.style.display = 'none';
                tableContainer.style.display = 'block';
                monthVisits.forEach(v => {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid var(--border-color)';
                    row.innerHTML = `
                        <td style="padding: 12px 8px;">${v.day}/${month}</td>
                        <td style="padding: 12px 8px; font-weight: 600;">${v.school}</td>
                        <td style="padding: 12px 8px;">${v.place}</td>
                        <td style="padding: 12px 8px; text-align: center;">${v.students}</td>
                        <td style="padding: 12px 8px;">${v.time} HS</td>
                    `;
                    body.appendChild(row);
                });
            } else {
                noData.style.display = 'block';
                tableContainer.style.display = 'none';
            }

            modal.classList.add('active');
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
            let dayVisits = allVisits[dateKey] || [];
            const isAdminView = document.body.classList.contains('admin-view');
            const btnAddFromDay = modal.querySelector('.id-btn-nueva-visita-from-day');
            
            if (btnAddFromDay) {
                btnAddFromDay.style.display = isAdminView ? 'block' : 'none';
            }

            if (!isAdminView) {
                const activeProfile = readStorageJSON(STORAGE_KEYS.activeProfile, null);
                if (activeProfile?.placeId) {
                    dayVisits = dayVisits.filter((visit) => Number(visit.placeId) === Number(activeProfile.placeId));
                }
            }
            
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

        // Add Profile Logic
        const addProfileInput = document.getElementById('new-profile-name');
        const addProfilePlaceSelect = document.getElementById('new-profile-place');
        const addProfileBtn = document.getElementById('btn-add-profile');
        const addPlaceInput = document.getElementById('new-place-name');
        const addPlaceColorInput = document.getElementById('new-place-color');
        const addPlaceBtn = document.getElementById('btn-add-place');
        const addUserUsernameInput = document.getElementById('new-user-username');
        const addUserPasswordInput = document.getElementById('new-user-password');
        const addUserPlaceSelect = document.getElementById('new-user-place');
        const addUserBtn = document.getElementById('btn-add-user');
        const editUserForm = document.getElementById('form-user-editor');
        const confirmDeleteUserBtn = document.getElementById('btn-confirm-delete-user');
        
        let pendingPlaceImageData = null;
        let pendingEditPlaceImageData = null;
        const btnTriggerNewPlaceImg = document.getElementById('btn-trigger-new-place-img');
        const newPlaceImgFile = document.getElementById('new-place-img-file');
        const newPlaceImgPreview = document.getElementById('new-place-img-preview');

        const btnTriggerEditPlaceImg = document.getElementById('btn-trigger-edit-place-img');
        const editPlaceImgFile = document.getElementById('edit-place-img-file');
        const editPlaceImgPreview = document.getElementById('edit-place-img-preview');
        const formEditarLugar = document.getElementById('form-editar-lugar');

        if (btnTriggerNewPlaceImg && newPlaceImgFile) {
            btnTriggerNewPlaceImg.addEventListener('click', () => newPlaceImgFile.click());
            newPlaceImgFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        pendingPlaceImageData = event.target.result;
                        if (newPlaceImgPreview) {
                            newPlaceImgPreview.innerHTML = `<img src="${pendingPlaceImageData}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (btnTriggerEditPlaceImg && editPlaceImgFile) {
            btnTriggerEditPlaceImg.addEventListener('click', () => editPlaceImgFile.click());
            editPlaceImgFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        pendingEditPlaceImageData = event.target.result;
                        if (editPlaceImgPreview) {
                            editPlaceImgPreview.innerHTML = `<img src="${pendingEditPlaceImageData}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (formEditarLugar) {
            formEditarLugar.addEventListener('submit', async (e) => {
                e.preventDefault();
                const index = Number(document.getElementById('edit-place-id')?.value);
                const current = places[index];
                if (!current) return;

                const newName = document.getElementById('edit-place-name')?.value?.trim();
                const newColor = document.getElementById('edit-place-color')?.value;

                if (!newName) return;

                try {
                    const response = await fetch(`/api/places/${current.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            name: newName, 
                            image_url: pendingEditPlaceImageData 
                        })
                    });
                    if (!response.ok) throw new Error("No se pudo actualizar");
                    const updated = await response.json();
                    places[index] = { ...updated, color: newColor };
                } catch (_error) {
                    places[index] = { 
                        ...current, 
                        name: newName, 
                        color: newColor, 
                        image_url: pendingEditPlaceImageData 
                    };
                }

                savePlacesToStorage();
                renderPlaces();
                document.getElementById('modal-editar-lugar').classList.remove('active');
                await showModal({
                    title: 'Lugar Actualizado',
                    message: 'Los cambios se guardaron correctamente.',
                    type: 'success'
                });
            });
        }

        if (addProfileBtn && addProfileInput && addProfilePlaceSelect) {
            addProfileBtn.addEventListener('click', async () => {
                const profileName = addProfileInput.value.trim();
                const placeId = Number(addProfilePlaceSelect.value);

                if (!profileName || !placeId) {
                    await showModal({
                        title: 'Datos Incompletos',
                        message: 'Por favor, completá el nombre del perfil y seleccioná un lugar asignado.',
                        type: 'error'
                    });
                    return;
                }

                profiles.push({
                    name: profileName,
                    placeId
                });
                saveProfilesToStorage();
                addProfileInput.value = '';
                addProfilePlaceSelect.value = '';
                renderProfiles();
                lucide.createIcons();
            });
        }

        if (addPlaceBtn && addPlaceInput) {
            addPlaceBtn.addEventListener('click', async () => {
                const newPlace = addPlaceInput.value.trim();
                const newColor = normalizeHexColor(addPlaceColorInput?.value, defaultPlaceColor(places.length));
                if (!newPlace) return;
                if (places.some((p) => p.name.toLowerCase() === newPlace.toLowerCase())) {
                    await showModal({
                        title: 'Lugar Existente',
                        message: 'Ese lugar ya se encuentra registrado en el sistema.',
                        type: 'error'
                    });
                    return;
                }

                try {
                    const response = await fetch("/api/places", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newPlace, image_url: pendingPlaceImageData })
                    });
                    if (!response.ok) throw new Error("No se pudo crear");
                    const createdPlace = await response.json();
                    places.push({ ...createdPlace, color: newColor });
                } catch (_error) {
                    // fallback local when API isn't available
                    const nextId = places.length ? Math.max(...places.map((p) => Number(p.id) || 0)) + 1 : 1;
                    places.push({ id: nextId, name: newPlace, color: newColor, image_url: pendingPlaceImageData });
                }

                savePlacesToStorage();
                addPlaceInput.value = '';
                pendingPlaceImageData = null;
                if (newPlaceImgPreview) {
                    newPlaceImgPreview.innerHTML = '<i data-lucide="image" style="width: 16px; color: var(--text-secondary);"></i>';
                    lucide.createIcons();
                }
                if (addPlaceColorInput) addPlaceColorInput.value = defaultPlaceColor(places.length);
                renderPlaces();
                lucide.createIcons();
            });
        }

        if (addUserBtn && addUserUsernameInput && addUserPasswordInput && addUserPlaceSelect) {
            addUserBtn.addEventListener('click', async () => {
                const username = addUserUsernameInput.value.trim();
                const password = addUserPasswordInput.value;
                const placeId = Number(addUserPlaceSelect.value);

                if (!username || !password || !placeId) {
                    showUsersFeedback("Completá usuario, contraseña y lugar.");
                    return;
                }

                try {
                    const response = await fetch("/api/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username,
                            password,
                            place_id: placeId,
                            full_name: username,
                        }),
                    });
                    if (!response.ok) throw new Error();
                    const created = await response.json();
                    managedUsers.push(created);
                    saveUsersToStorage();
                    addUserUsernameInput.value = "";
                    addUserPasswordInput.value = "";
                    addUserPlaceSelect.value = "";
                    renderUsersAdmin();
                    lucide.createIcons();
                    showUsersFeedback("Usuario creado correctamente.", "success");
                } catch (_error) {
                    const nextId = managedUsers.length
                        ? Math.max(...managedUsers.map((u) => Number(u.id) || 0)) + 1
                        : 1;
                    managedUsers.push({
                        id: nextId,
                        email: username,
                        username,
                        full_name: username,
                        place_id: placeId,
                        password,
                        role: "user",
                    });
                    saveUsersToStorage();
                    addUserUsernameInput.value = "";
                    addUserPasswordInput.value = "";
                    addUserPlaceSelect.value = "";
                    renderUsersAdmin();
                    lucide.createIcons();
                    showUsersFeedback("Usuario creado en modo local (sin base de datos).", "success");
                }
            });
        }

        if (editUserForm) {
            editUserForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (editingUserIndex === null) return;
                const user = managedUsers[editingUserIndex];
                if (!user) return;
                const usernameInput = document.getElementById("edit-user-username");
                const passwordInput = document.getElementById("edit-user-password");
                const placeSelect = document.getElementById("edit-user-place");
                const username = usernameInput?.value?.trim();
                const placeId = Number(placeSelect?.value);
                const password = passwordInput?.value?.trim();
                if (!username || !placeId) {
                    showUsersFeedback("Completá usuario y lugar.");
                    return;
                }

                const payload = {
                    username,
                    place_id: placeId,
                    full_name: username,
                };
                if (password) payload.password = password;

                try {
                    const response = await fetch(`/api/users/${user.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                    if (!response.ok) throw new Error();
                    managedUsers[editingUserIndex] = await response.json();
                } catch (_error) {
                    managedUsers[editingUserIndex] = {
                        ...user,
                        email: username,
                        username,
                        full_name: username,
                        place_id: placeId,
                        password: password || user.password,
                    };
                }

                saveUsersToStorage();
                document.getElementById("modal-user-editor")?.classList.remove("active");
                editingUserIndex = null;
                renderUsersAdmin();
                lucide.createIcons();
                showUsersFeedback("Usuario actualizado.", "success");
            });
        }

        if (confirmDeleteUserBtn) {
            confirmDeleteUserBtn.addEventListener("click", async () => {
                if (deletingUserIndex === null) return;
                const user = managedUsers[deletingUserIndex];
                if (!user) return;
                try {
                    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
                    if (!response.ok) throw new Error();
                } catch (_error) {
                    // fallback local mode
                }
                managedUsers.splice(deletingUserIndex, 1);
                saveUsersToStorage();
                deletingUserIndex = null;
                document.getElementById("modal-user-delete")?.classList.remove("active");
                renderUsersAdmin();
                lucide.createIcons();
                showUsersFeedback("Usuario eliminado.", "success");
            });
        }

        const updateDashboardCards = () => {
            const activeProfile = readStorageJSON(STORAGE_KEYS.activeProfile, null);
            const isAdminView = document.body.classList.contains('admin-view');
            
            // Get all flattened visits
            let flatVisits = [];
            for (const [dateKey, visits] of Object.entries(allVisits)) {
                visits.forEach(v => {
                    if (isAdminView || !activeProfile?.placeId || Number(v.placeId) === Number(activeProfile.placeId)) {
                        flatVisits.push({ ...v, dateKey });
                    }
                });
            }

            // Sort by date and time
            flatVisits.sort((a, b) => {
                const dateCompare = a.dateKey.localeCompare(b.dateKey);
                if (dateCompare !== 0) return dateCompare;
                return (a.time || a.visit_time).localeCompare(b.time || b.visit_time);
            });

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            // Today's assignment
            const todayVisits = flatVisits.filter(v => v.dateKey === todayStr);
            const nextVisit = flatVisits.find(v => {
                if (v.dateKey > todayStr) return true;
                if (v.dateKey === todayStr) {
                    const [h, m] = (v.time || v.visit_time).split(':').map(Number);
                    const visitTime = new Date();
                    visitTime.setHours(h, m, 0, 0);
                    return visitTime > now;
                }
                return false;
            });

            // Update Next Visit UI
            const nextName = document.getElementById('dashboard-next-visit-name');
            const nextAddress = document.getElementById('dashboard-next-visit-address');
            const nextTime = document.getElementById('dashboard-next-visit-time');
            const nextCard = document.getElementById('dashboard-next-visit-card');
            
            if (nextName) {
                if (nextVisit) {
                    nextName.textContent = (nextVisit.school || nextVisit.school_name);
                    if (nextTime) nextTime.textContent = `${nextVisit.time || nextVisit.visit_time} hs`;
                    if (nextAddress) nextAddress.textContent = nextVisit.place || nextVisit.place_name || 'Lugar asignado';
                    
                    if (nextCard) {
                        const p = getPlaceById(nextVisit.placeId);
                        if (p?.image_url) {
                            nextCard.style.backgroundImage = `linear-gradient(rgba(10,30,60,0.85), rgba(10,30,60,0.85)), url(${p.image_url})`;
                            nextCard.style.backgroundSize = 'cover';
                        } else {
                            nextCard.style.backgroundImage = '';
                        }
                    }
                } else {
                    nextName.textContent = 'Sin próximas visitas';
                    if (nextTime) nextTime.textContent = '--';
                    if (nextAddress) nextAddress.textContent = '--';
                    if (nextCard) nextCard.style.backgroundImage = '';
                }
            }

            // Update Today Assignment UI
            const todaySchool = document.getElementById('dashboard-today-school');
            const todayPlace = document.getElementById('dashboard-today-place');
            const todayTime = document.getElementById('dashboard-today-time');
            const todayImg = document.getElementById('dashboard-today-img');

            if (todaySchool) {
                if (todayVisits.length > 0) {
                    const first = todayVisits[0];
                    todaySchool.textContent = (first.school || first.school_name);
                    if (todayPlace) todayPlace.textContent = first.place || first.place_name || 'Lugar asignado';
                    if (todayTime) todayTime.textContent = first.time || first.visit_time;
                    
                    if (todayImg) {
                        const p = getPlaceById(first.placeId);
                        todayImg.src = p?.image_url || 'classroom_preview.png';
                    }
                } else {
                    todaySchool.textContent = 'Sin visitas para hoy';
                    if (todayPlace) todayPlace.textContent = '--';
                    if (todayTime) todayTime.textContent = '--';
                    if (todayImg) todayImg.src = 'classroom_preview.png';
                }
            }
        };

        // Initial render
        (async () => {
            renderCalendar(currentDate);
            updateMonthlyStats(currentDate);
            updateDashboardCards();
            renderPlaces();
            await loadRemoteData();
            renderCalendar(currentDate);
            updateMonthlyStats(currentDate);
            updateDashboardCards();
            renderPlaces();
        })();

        const btnVerReporteMensual = document.getElementById('btn-ver-reporte-mensual');
        const modalReporteMensual = document.getElementById('modal-reporte-mensual');
        const btnExportPdf = document.getElementById('btn-export-pdf');

        if (btnVerReporteMensual) {
            btnVerReporteMensual.addEventListener('click', openMonthlyReport);
        }

        if (btnExportPdf) {
            btnExportPdf.addEventListener('click', () => {
                const printContent = document.getElementById('modal-reporte-mensual').querySelector('.modal-content').innerHTML;
                
                // Create a temporary print view
                const printWindow = window.open('', '', 'height=600,width=800');
                printWindow.document.write('<html><head><title>Reporte Mensual MuniBus</title>');
                printWindow.document.write('<style>body{font-family:sans-serif;padding:40px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:12px;text-align:left;} th{background:#f4f4f4;} .close-modal, #btn-export-pdf {display:none;}</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContent);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            });
        }

        // --- Admin Modal Logic ---
        const btnNuevaVisita = document.getElementById('btn-nueva-visita');
        const btnGestionarPerfiles = document.getElementById('btn-gestionar-perfiles');
        const btnGestionarLugares = document.getElementById('btn-gestionar-lugares');
        const btnGestionarUsuarios = document.getElementById('btn-gestionar-usuarios');
        const btnConfiguracion = document.getElementById('btn-configuracion');
        const btnDocumentos = document.getElementById('btn-documentos');
        
        const modalAgregar = document.getElementById('modal-agregar');
        const modalPerfiles = document.getElementById('modal-perfiles');
        const modalLugares = document.getElementById('modal-lugares');
        const modalUsuarios = document.getElementById('modal-usuarios');
        const modalUserEditor = document.getElementById('modal-user-editor');
        const modalUserDelete = document.getElementById('modal-user-delete');
        const modalConfiguracion = document.getElementById('modal-configuracion');
        const modalDocumentos = document.getElementById('modal-documentos');
        const modalDiaDetalle = document.getElementById('modal-dia-detalle');
        const formVisita = document.getElementById('form-visita');

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

        // Toggle Gestionar Perfiles
        if (btnGestionarPerfiles && modalPerfiles) {
            btnGestionarPerfiles.addEventListener('click', () => modalPerfiles.classList.add('active'));
        }
        
        // Toggle Gestionar Lugares
        if (btnGestionarLugares && modalLugares) {
            btnGestionarLugares.addEventListener('click', () => modalLugares.classList.add('active'));
        }

        if (btnGestionarUsuarios && modalUsuarios) {
            btnGestionarUsuarios.addEventListener('click', () => {
                const feedback = document.getElementById("users-feedback");
                if (feedback) feedback.style.display = "none";
                modalUsuarios.classList.add('active');
            });
        }

        // Toggle Configuración
        if (btnConfiguracion && modalConfiguracion) {
            btnConfiguracion.addEventListener('click', () => modalConfiguracion.classList.add('active'));
        }

        // Toggle Documentos
        if (btnDocumentos && modalDocumentos) {
            btnDocumentos.addEventListener('click', () => modalDocumentos.classList.add('active'));
        }

        // Shared global close logic (Capturing any click on .close-modal)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-modal')) {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            }
        });

        // Close on overlay click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.classList.remove('active');
            }
        });

        // Upload Document Logic
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.getElementById('input-upload-doc');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', async (e) => {
                if (e.target.files.length > 0) {
                    const visibility = document.getElementById('doc-visibility-select').value.toUpperCase();
                    await showModal({
                        title: 'Documento Subido',
                        message: `¡El archivo "${e.target.files[0].name}" se subió con éxito!\nVisibilidad: ${visibility}`,
                        type: 'success'
                    });
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
            btnSaveConfig.addEventListener('click', async () => {
                if (headerUserName && configUserName) {
                    headerUserName.textContent = configUserName.value;
                }
                if (headerUserImg && pendingImageData) {
                    headerUserImg.src = pendingImageData;
                }
                await showModal({
                    title: 'Perfil Actualizado',
                    message: 'La configuración de tu perfil se ha guardado correctamente.',
                    type: 'success'
                });
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
                const studentsCount = Number(studentsInput?.value);

                if (studentsCount <= 0) {
                    await showModal({
                        title: 'Dato Inválido',
                        message: 'La cantidad de alumnos debe ser mayor a 0.',
                        type: 'error'
                    });
                    return;
                }

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
                        place: placeName,
                        placeId: Number(createdVisit.place_id)
                    });

                    renderCalendar(currentDate);
                    await showModal({
                        title: 'Visita Programada',
                        message: '¡La visita se ha registrado y agendado con éxito!',
                        type: 'success'
                    });
                    modalAgregar.classList.remove('active');
                    formVisita.reset();
                } catch (error) {
                    await showModal({
                        title: 'Error de Guardado',
                        message: 'No se pudo guardar la visita en la base de datos. Por favor, intentá nuevamente.',
                        type: 'error'
                    });
                }
            });
        }
    }
});
