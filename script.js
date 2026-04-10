document.addEventListener('DOMContentLoaded', () => {
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

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEYS.activeProfile);
            window.location.href = 'index.html';
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
            const loginValue = userInput?.value?.trim();
            const loginPassword = passwordInput?.value;

            try {
                // Primero intentamos login de administrador en el mismo formulario.
                const response = await fetch('/api/auth/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: loginValue,
                        password: loginPassword
                    })
                });
                if (response.ok) {
                    window.location.href = 'admin-dashboard.html';
                    return;
                }

                // Si no es admin, intenta login de usuario creado por administrador.
                const userLoginResponse = await fetch('/api/auth/user/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: loginValue,
                        password: loginPassword
                    })
                });
                if (userLoginResponse.ok) {
                    const payload = await userLoginResponse.json();
                    writeStorageJSON(STORAGE_KEYS.activeProfile, {
                        id: payload.user.id,
                        name: payload.user.full_name || payload.user.username,
                        username: payload.user.username,
                        placeId: Number(payload.user.place_id),
                        placeName: payload.user.place_name,
                    });
                    window.location.href = 'dashboard.html';
                    return;
                }

                const localUsers = readStorageJSON(STORAGE_KEYS.users, []);
                const localUser = localUsers.find(
                    (user) =>
                        String(user.username || "").toLowerCase() === String(loginValue || "").toLowerCase() &&
                        String(user.password || "") === String(loginPassword || "")
                );
                if (localUser) {
                    writeStorageJSON(STORAGE_KEYS.activeProfile, {
                        id: localUser.id,
                        name: localUser.full_name || localUser.username,
                        username: localUser.username,
                        placeId: Number(localUser.place_id),
                    });
                    window.location.href = 'dashboard.html';
                    return;
                }

                // Fallback local (modo sin backend)
                const profileName = loginValue;
                const storedProfiles = readStorageJSON(STORAGE_KEYS.profiles, []);
                const matchedProfile = storedProfiles.find(
                    (profile) => String(profile.name || "").toLowerCase() === String(profileName || "").toLowerCase()
                );
                if (matchedProfile) {
                    writeStorageJSON(STORAGE_KEYS.activeProfile, matchedProfile);
                    window.location.href = 'dashboard.html';
                    return;
                }
                throw new Error("Credenciales inválidas");
            } catch (_error) {
                alert('Usuario/perfil inválido o sin permisos.');
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
            { id: 1, name: "Museo Histórico Provincial", color: "#1171ba" },
            { id: 2, name: "Palacio Municipal", color: "#6366f1" },
            { id: 3, name: "Puerto de Santa Fe", color: "#0ea5e9" },
            { id: 4, name: "Manzana de las Luces", color: "#14b8a6" },
            { id: 5, name: "Teatro Municipal", color: "#f59e0b" },
        ];
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
                const byId = storedPlaces.find((saved) => Number(saved.id) === Number(place.id));
                const byName = storedPlaces.find(
                    (saved) => String(saved.name || "").toLowerCase() === String(place.name || "").toLowerCase()
                );
                const saved = byId || byName || {};
                return {
                    ...place,
                    color: normalizeHexColor(saved.color, defaultPlaceColor(index)),
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

        let profiles = [
            { name: "Perfil Norte", placeId: 1 },
            { name: "Perfil Centro", placeId: 2 }
        ];
        let managedUsers = [];
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
                    btn.addEventListener('click', () => {
                        const index = Number(btn.dataset.profileIndex);
                        if (!Number.isInteger(index) || !profiles[index]) return;
                        const confirmDelete = confirm(`¿Eliminar el perfil "${profiles[index].name}"?`);
                        if (!confirmDelete) return;
                        profiles.splice(index, 1);
                        saveProfilesToStorage();
                        renderProfiles();
                        lucide.createIcons();
                    });
                });

                profilesContainer.querySelectorAll('.btn-edit-profile').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const index = Number(btn.dataset.profileIndex);
                        const current = profiles[index];
                        if (!Number.isInteger(index) || !current) return;

                        const newName = prompt("Editar nombre del perfil:", current.name);
                        if (newName === null) return;
                        const normalizedName = newName.trim();
                        if (!normalizedName) {
                            alert("El nombre del perfil no puede estar vacío.");
                            return;
                        }

                        const placesOptions = places
                            .map((p) => `${p.id}: ${p.name}`)
                            .join("\n");
                        const newPlaceRaw = prompt(
                            `Asignar lugar por ID:\n${placesOptions}`,
                            String(current.placeId)
                        );
                        if (newPlaceRaw === null) return;
                        const newPlaceId = Number(newPlaceRaw);
                        const placeExists = places.some((p) => Number(p.id) === newPlaceId);
                        if (!placeExists) {
                            alert("ID de lugar inválido.");
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
                row.innerHTML = `
                    <span style="font-weight: 500; display: inline-flex; align-items: center; gap: 8px;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${normalizeHexColor(place.color, defaultPlaceColor(index))}; display: inline-block;"></span>
                        ${place.name}
                    </span>
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
                btn.addEventListener('click', async () => {
                    const index = Number(btn.dataset.placeIndex);
                    const current = places[index];
                    if (!Number.isInteger(index) || !current) return;

                    const newNameInput = prompt("Nuevo nombre del lugar:", current.name);
                    if (newNameInput === null) return;
                    const newName = newNameInput.trim();
                    if (!newName) {
                        alert("El nombre del lugar no puede estar vacío.");
                        return;
                    }
                    if (places.some((p, i) => i !== index && p.name.toLowerCase() === newName.toLowerCase())) {
                        alert("Ya existe un lugar con ese nombre.");
                        return;
                    }

                    try {
                        const response = await fetch(`/api/places/${current.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: newName })
                        });
                        if (!response.ok) throw new Error("No se pudo actualizar");
                        const updated = await response.json();
                        places[index] = { ...updated, color: current.color };
                    } catch (_error) {
                        // fallback local when API isn't available
                        places[index] = { ...current, name: newName };
                    }

                    const newColorInput = prompt("Color HEX del lugar (ej: #1171ba):", current.color || "#1171ba");
                    if (newColorInput !== null) {
                        places[index].color = normalizeHexColor(newColorInput, current.color || "#1171ba");
                    }

                    savePlacesToStorage();
                    renderPlaces();
                    lucide.createIcons();
                });
            });

            placesAdminContainer.querySelectorAll('.btn-delete-place').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const index = Number(btn.dataset.placeIndex);
                    const current = places[index];
                    if (!Number.isInteger(index) || !current) return;

                    const inUseByProfile = profiles.some((profile) => Number(profile.placeId) === Number(current.id));
                    if (inUseByProfile) {
                        alert("No se puede borrar: hay perfiles asignados a este lugar.");
                        return;
                    }

                    const confirmDelete = confirm(`¿Eliminar el lugar "${current.name}"?`);
                    if (!confirmDelete) return;

                    try {
                        const response = await fetch(`/api/places/${current.id}`, { method: "DELETE" });
                        if (!response.ok) {
                            if (response.status === 409) {
                                alert("No se puede borrar: el lugar tiene visitas asociadas.");
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

        if (addProfileBtn && addProfileInput && addProfilePlaceSelect) {
            addProfileBtn.addEventListener('click', () => {
                const profileName = addProfileInput.value.trim();
                const placeId = Number(addProfilePlaceSelect.value);

                if (!profileName || !placeId) {
                    alert("Completá nombre del perfil y lugar asignado.");
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
                    alert("Ese lugar ya existe.");
                    return;
                }

                try {
                    const response = await fetch("/api/places", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newPlace })
                    });
                    if (!response.ok) throw new Error("No se pudo crear");
                    const createdPlace = await response.json();
                    places.push({ ...createdPlace, color: newColor });
                } catch (_error) {
                    // fallback local when API isn't available
                    const nextId = places.length ? Math.max(...places.map((p) => Number(p.id) || 0)) + 1 : 1;
                    places.push({ id: nextId, name: newPlace, color: newColor });
                }

                savePlacesToStorage();
                addPlaceInput.value = '';
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

        // Initial render
        (async () => {
            await loadRemoteData();
            renderCalendar(currentDate);
            renderPlaces();
        })();

        // --- Admin Modal Logic ---
        const btnResumenDia = document.getElementById('btn-resumen-dia');
        const btnNuevaVisita = document.getElementById('btn-nueva-visita');
        const btnGestionarPerfiles = document.getElementById('btn-gestionar-perfiles');
        const btnGestionarUsuarios = document.getElementById('btn-gestionar-usuarios');
        const btnConfiguracion = document.getElementById('btn-configuracion');
        const btnDocumentos = document.getElementById('btn-documentos');
        
        const modalAgregar = document.getElementById('modal-agregar');
        const modalPerfiles = document.getElementById('modal-perfiles');
        const modalUsuarios = document.getElementById('modal-usuarios');
        const modalUserEditor = document.getElementById('modal-user-editor');
        const modalUserDelete = document.getElementById('modal-user-delete');
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

        // Toggle Gestionar Perfiles
        if (btnGestionarPerfiles && modalPerfiles) {
            btnGestionarPerfiles.addEventListener('click', () => modalPerfiles.classList.add('active'));
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

        // Shared close logic for all modals
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modalAgregar?.classList.remove('active');
                modalPerfiles?.classList.remove('active');
                modalUsuarios?.classList.remove('active');
                modalUserEditor?.classList.remove('active');
                modalUserDelete?.classList.remove('active');
                modalConfiguracion?.classList.remove('active');
                modalDocumentos?.classList.remove('active');
                modalDiaDetalle?.classList.remove('active');
            });
        });

        // Close on overlay click
        window.addEventListener('click', (e) => {
            if (e.target === modalAgregar) modalAgregar.classList.remove('active');
            if (e.target === modalPerfiles) modalPerfiles.classList.remove('active');
            if (e.target === modalUsuarios) modalUsuarios.classList.remove('active');
            if (e.target === modalUserEditor) modalUserEditor.classList.remove('active');
            if (e.target === modalUserDelete) modalUserDelete.classList.remove('active');
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
                        place: placeName,
                        placeId: Number(createdVisit.place_id)
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
