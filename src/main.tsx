import { StrictMode, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { api, ApiError } from './api';
import type {
  Appointment,
  AppointmentStatus,
  AvailableSlot,
  Location,
  Professional,
  Registration,
  Session,
  Specialty,
  AvailabilityBlock,
} from './api';
import './styles.css';

const emptyReg: Registration = {
  firstName: '',
  lastName: '',
  documentType: 'CC',
  documentNumber: '',
  email: '',
  phone: '',
  password: '',
};

type PortalTab = 'book' | 'my-appointments' | 'admin-appointments' | 'prof-agenda' | 'prof-blocks' | 'professionals';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<PortalTab>('book');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fields, setFields] = useState(emptyReg);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Catálogos globales
  const [locations, setLocations] = useState<Location[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [statuses, setStatuses] = useState<AppointmentStatus[]>([]);

  // Estados de Vistas
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [adminAppointments, setAdminAppointments] = useState<Appointment[]>([]);
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('REQUESTED');
  const [profAppointments, setProfAppointments] = useState<Appointment[]>([]);
  const [profDate, setProfDate] = useState<string>('2026-10-01');
  const [professionalsList, setProfessionalsList] = useState<Professional[]>([]);

  // Estado de Agendamiento
  const [bookLocationId, setBookLocationId] = useState<number>(1);
  const [bookSpecialtyId, setBookSpecialtyId] = useState<number>(1);
  const [bookProfessionalId, setBookProfessionalId] = useState<number>(0); // 0 = cualquier profesional
  const [bookDate, setBookDate] = useState<string>('2026-10-01');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Modal Rechazo Admin
  const [rejectModalAppId, setRejectModalAppId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Bloques Profesional
  const [profBlocks, setProfBlocks] = useState<AvailabilityBlock[]>([]);
  const [newBlockDate, setNewBlockDate] = useState<string>('2026-10-05');
  const [newBlockLocationId, setNewBlockLocationId] = useState<number>(1);
  const [newBlockStart, setNewBlockStart] = useState<string>('08:00');
  const [newBlockEnd, setNewBlockEnd] = useState<string>('12:00');

  // Formulario Creación de Profesional (Admin)
  const [showNewProfForm, setShowNewProfForm] = useState(false);
  const [newProfFirstName, setNewProfFirstName] = useState('');
  const [newProfLastName, setNewProfLastName] = useState('');
  const [newProfDocType, setNewProfDocType] = useState('CC');
  const [newProfDocNumber, setNewProfDocNumber] = useState('');
  const [newProfEmail, setNewProfEmail] = useState('');
  const [newProfPhone, setNewProfPhone] = useState('+57 300 000 0000');
  const [newProfPass, setNewProfPass] = useState('Doc123*');
  const [newProfCode, setNewProfCode] = useState('');
  const [newProfLicense, setNewProfLicense] = useState('');
  const [newProfSpecialtyIds, setNewProfSpecialtyIds] = useState<number[]>([]);
  const [newProfLocationIds, setNewProfLocationIds] = useState<number[]>([1, 2]);

  const sessionRef = useRef<Session | null>(null);
  const renewing = useRef<Promise<Session> | null>(null);

  function remember(value: Session | null) {
    sessionRef.current = value;
    setSession(value);
  }

  async function renew() {
    if (renewing.current) return renewing.current;
    const current = sessionRef.current;
    if (!current) throw new ApiError('Inicia sesión nuevamente.', 401);
    const work = api.refresh(current.refreshToken).then(next => {
      if (sessionRef.current === current) remember(next);
      return next;
    }).finally(() => { renewing.current = null; });
    renewing.current = work;
    return work;
  }

  // Refresco de token automático en memoria
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void renew().catch(() => {
        remember(null);
        setError('Tu sesión terminó. Inicia sesión nuevamente.');
      });
    }, Math.max(1000, (session.expiresIn - 30) * 1000));
    return () => window.clearTimeout(timer);
  }, [session]);

  function loadCatalogs() {
    void api.locations().then(setLocations).catch(() => {});
    void api.specialties().then(setSpecialties).catch(() => {});
    void api.statuses().then(setStatuses).catch(() => {});
    void api.professionals().then(setProfessionalsList).catch(() => {});
  }

  // Carga inicial y cuando cambia la sesión
  useEffect(() => {
    loadCatalogs();
  }, [session]);

  // Cargar datos cuando cambia la pestaña
  useEffect(() => {
    if (!session) return;
    if (tab === 'my-appointments') {
      loadMyAppointments();
    } else if (tab === 'admin-appointments') {
      loadAdminAppointments();
    } else if (tab === 'prof-agenda') {
      loadProfAppointments();
    } else if (tab === 'prof-blocks') {
      loadProfBlocks();
    } else if (tab === 'professionals') {
      void api.professionals().then(setProfessionalsList).catch(() => {});
    }
  }, [tab, session, profDate]);

  function loadMyAppointments() {
    if (!session) return;
    api.myAppointments(session.accessToken)
      .then(setMyAppointments)
      .catch(err => setError(err.message));
  }

  function loadAdminAppointments() {
    if (!session) return;
    const statObj = statuses.find(s => s.code === adminStatusFilter);
    api.adminAppointments({ statusId: statObj?.id }, session.accessToken)
      .then(setAdminAppointments)
      .catch(err => setError(err.message));
  }

  function loadProfAppointments() {
    if (!session) return;
    api.professionalAppointments(profDate, session.accessToken)
      .then(setProfAppointments)
      .catch(err => setError(err.message));
  }

  function loadProfBlocks() {
    if (!session) return;
    const prof = professionalsList.find(p => p.userId === session.user.id);
    if (prof) {
      api.getBlocks(prof.id, session.accessToken)
        .then(setProfBlocks)
        .catch(err => setError(err.message));
    }
  }

  function changeMode(next: 'login' | 'register') {
    setMode(next);
    setError('');
    setNotice('');
    setVisible(false);
    setFields(val => ({ ...val, password: '' }));
  }

  async function quickLogin(email: string, pass: string) {
    if (busy) return;
    setFields(val => ({ ...val, email, password: pass }));
    setError('');
    setNotice(`Iniciando sesión como ${email}...`);
    setBusy(true);
    try {
      const next = await api.login(email.trim().toLowerCase(), pass);
      setSession(next);
      setFields(val => ({ ...val, password: '' }));
      setNotice(`¡Bienvenido(a), ${next.user.firstName}! Sesión iniciada con éxito.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
      setNotice('');
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'register') {
        await api.register({ ...fields, email: fields.email.trim().toLowerCase() });
        setFields(val => ({ ...val, password: '' }));
        setMode('login');
        setNotice('Cuenta creada con éxito. Ya puedes iniciar sesión.');
      } else {
        const next = await api.login(fields.email.trim().toLowerCase(), fields.password);
        await api.me(next.accessToken);
        remember(next);
        setFields(emptyReg);
        // Cargar profesionales de inmediato
        void api.professionals().then(setProfessionalsList);
        if (next.user.roles.includes('ADMIN')) setTab('admin-appointments');
        else if (next.user.roles.includes('PROFESSIONAL')) setTab('prof-agenda');
        else setTab('book');
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Error en la solicitud.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (sessionRef.current) {
        await api.logout(sessionRef.current.accessToken);
      }
      remember(null);
      setNotice('Sesión cerrada correctamente.');
    } catch {
      remember(null);
    } finally {
      setBusy(false);
    }
  }

  // --- Operaciones de Agendamiento ---
  async function searchSlots() {
    setBusy(true);
    setError('');
    setNotice('');
    setSelectedSlot(null);
    try {
      const slots = await api.availability({
        locationId: bookLocationId,
        specialtyId: bookSpecialtyId,
        professionalId: bookProfessionalId > 0 ? bookProfessionalId : undefined,
        date: bookDate,
      });
      setAvailableSlots(slots);
      if (slots.length === 0) {
        setNotice('No hay turnos disponibles para esta combinación de sede, especialidad y fecha.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar disponibilidad.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmBooking() {
    if (!selectedSlot || !session) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.bookAppointment({
        professionalId: selectedSlot.professionalId,
        locationId: selectedSlot.locationId,
        specialtyId: selectedSlot.specialtyId,
        startAt: selectedSlot.startAt,
      }, session.accessToken);

      setSelectedSlot(null);
      setAvailableSlots([]);
      setTab('my-appointments');
      setNotice(created.statusCode === 'APPROVED'
        ? `¡Cita de Medicina General confirmada automáticamente para el ${created.scheduledStartAt.replace('T', ' ')}!`
        : `¡Solicitud de cita especializada registrada! Queda en estado REQUESTED y será revisada por Administración.`);
      loadMyAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agendar la cita.');
    } finally {
      setBusy(false);
    }
  }

  async function cancelApp(appId: number) {
    if (!session || !confirm('¿Estás seguro de cancelar esta cita?')) return;
    setBusy(true);
    setError('');
    try {
      await api.cancelAppointment(appId, session.accessToken);
      setNotice('Cita cancelada correctamente. Los horarios han sido liberados.');
      loadMyAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la cita.');
    } finally {
      setBusy(false);
    }
  }

  // --- Operaciones de Admin ---
  async function approveApp(appId: number) {
    if (!session) return;
    setBusy(true);
    try {
      await api.approveAppointment(appId, session.accessToken);
      setNotice('Cita especializada aprobada exitosamente.');
      loadAdminAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmReject() {
    if (!session || !rejectModalAppId) return;
    if (!rejectReason.trim()) {
      setError('Debes especificar un motivo de rechazo (RN-04).');
      return;
    }
    setBusy(true);
    try {
      await api.rejectAppointment(rejectModalAppId, rejectReason.trim(), session.accessToken);
      setNotice('Cita rechazada y horarios liberados.');
      setRejectModalAppId(null);
      setRejectReason('');
      loadAdminAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar.');
    } finally {
      setBusy(false);
    }
  }

  async function submitNewProf(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (newProfSpecialtyIds.length === 0) {
      setError('Debes seleccionar al menos una especialidad.');
      return;
    }
    if (newProfLocationIds.length === 0) {
      setError('Debes seleccionar al menos una sede.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.createProfessional({
        firstName: newProfFirstName.trim(),
        lastName: newProfLastName.trim(),
        documentType: newProfDocType,
        documentNumber: newProfDocNumber.trim(),
        email: newProfEmail.trim().toLowerCase(),
        phone: newProfPhone.trim(),
        password: newProfPass,
        professionalCode: newProfCode.trim(),
        licenseNumber: newProfLicense.trim(),
        specialtyIds: newProfSpecialtyIds,
        locationIds: newProfLocationIds,
      }, session.accessToken);

      setNotice('¡Profesional registrado exitosamente con sus especialidades y sedes asignadas!');
      setShowNewProfForm(false);
      setNewProfFirstName('');
      setNewProfLastName('');
      setNewProfDocNumber('');
      setNewProfEmail('');
      setNewProfCode('');
      setNewProfLicense('');
      setNewProfSpecialtyIds([]);
      void api.professionals().then(setProfessionalsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar profesional.');
    } finally {
      setBusy(false);
    }
  }

  // --- Operaciones de Profesional ---
  async function completeApp(appId: number) {
    if (!session) return;
    setBusy(true);
    try {
      await api.completeAppointment(appId, session.accessToken);
      setNotice('Cita marcada como ATENDIDA (COMPLETED).');
      loadProfAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar atención.');
    } finally {
      setBusy(false);
    }
  }

  async function noShowApp(appId: number) {
    if (!session) return;
    const reason = prompt('Motivo o nota de inasistencia (opcional):') || undefined;
    setBusy(true);
    try {
      await api.noShowAppointment(appId, reason, session.accessToken);
      setNotice('Cita marcada como NO ASISTIÓ (NO_SHOW).');
      loadProfAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar inasistencia.');
    } finally {
      setBusy(false);
    }
  }

  async function createBlock() {
    if (!session) return;
    const prof = professionalsList.find(p => p.userId === session.user.id);
    if (!prof) {
      setError('No eres un profesional registrado.');
      return;
    }
    setBusy(true);
    try {
      await api.createBlock(prof.id, {
        locationId: newBlockLocationId,
        date: newBlockDate,
        startTime: newBlockStart,
        endTime: newBlockEnd,
      }, session.accessToken);
      setNotice('Bloque de disponibilidad creado y discretizado en slots de 30 min.');
      loadProfBlocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear bloque.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteBlock(blockId: number) {
    if (!session || !confirm('¿Eliminar este bloque?')) return;
    const prof = professionalsList.find(p => p.userId === session.user.id);
    if (!prof) return;
    setBusy(true);
    try {
      await api.deleteBlock(prof.id, blockId, session.accessToken);
      setNotice('Bloque eliminado correctamente.');
      loadProfBlocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar bloque.');
    } finally {
      setBusy(false);
    }
  }

  const selectedSpecObj = specialties.find(s => s.id === bookSpecialtyId);
  const matchingProfs = professionalsList.filter(p => p.specialties.some(s => s.id === bookSpecialtyId));
  const isAdmin = session?.user.roles.includes('ADMIN');
  const isProf = session?.user.roles.includes('PROFESSIONAL');

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="FCV Citas">
          <span className="brand-mark">✚</span>
          <span>
            FCV <strong>Citas</strong>
            <small>PORTAL INTEGRAL DE ATENCIÓN</small>
          </span>
        </a>

        {session ? (
          <div className="user-badge-bar">
            <div className="user-info">
              <strong>{session.user.firstName} {session.user.lastName}</strong>
              <small>{session.user.email}</small>
            </div>
            <div className="roles-tags">
              {session.user.roles.map(r => (
                <span
                  key={r}
                  className={`role-pill ${r === 'ADMIN' ? 'admin' : r === 'PROFESSIONAL' ? 'prof' : ''}`}
                >
                  {r}
                </span>
              ))}
            </div>
            <button className="btn-logout" onClick={() => void logout()} disabled={busy}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <span className="lab-badge"><span /> Entorno FCV Citas S3</span>
        )}
      </header>

      {/* Alertas globales */}
      {error && <div className="message error" role="alert">{error}</div>}
      {notice && <div className="message success" role="status">{notice}</div>}

      {!session ? (
        /* PANTALLA DE ACCESO (LOGIN & REGISTRO) */
        <main className="auth-main">
          <aside className="welcome-panel">
            <div className="eyebrow"><span /> AGENDAMIENTO INTELIGENTE FCV</div>
            <h1>Tu salud, <br />coordinada en <em>un solo lugar.</em></h1>
            <p className="intro">
              Sistema de citas médicas con validación de disponibilidad en tiempo real,
              aprobación inmediata para medicina general y gestión administrativa para especialidades.
            </p>
            <div className="illustration" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="appointment-card">
                <div className="mini-label">DISPONIBILIDAD ACTIVA</div>
                <div className="card-title">Turnos en vivo <span>↗</span></div>
                <div className="calendar-row"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span></div>
                <div className="calendar-row dates"><span>1</span><span>2</span><span>3</span><span className="selected">4</span><span>5</span></div>
                <div className="card-foot"><span className="circle-check">✓</span> Sedes HIC & ICV</div>
              </div>
              <span className="floating-cross">✚</span>
            </div>
            <div className="locations">
              <span>SEDES DISPONIBLES</span>
              <p>HIC · Autopista Piedecuesta <i /> ICV · El Bosque Floridablanca</p>
            </div>
          </aside>

          <section className="access-panel">
            <div className="form-content">
              <span className="section-label">PORTAL DE ACCESO</span>
              <h2>{mode === 'login' ? 'Bienvenido a FCV Citas' : 'Crea tu cuenta de paciente'}</h2>
              <p className="subtitle">
                {mode === 'login' ? 'Ingresa con tu cuenta o selecciona un perfil de prueba rápido:' : 'Diligencia tus datos para registrarte en el sistema:'}
              </p>

              {/* Botones de autocompletar perfiles de prueba */}
              {mode === 'login' && (
                <div className="quick-auth-box">
                  <div className="quick-auth-title">⚡ Cuentas de prueba rápida (1 clic):</div>
                  <div className="quick-auth-grid">
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => void quickLogin('paciente@fcv.test', 'User123*')}
                      disabled={busy}
                    >
                      <strong>👤 Laura Martínez</strong>
                      <span>Paciente (11 citas)</span>
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => void quickLogin('dr.mendoza@fcv.test', 'Doc123*')}
                      disabled={busy}
                    >
                      <strong>🩺 Dr. C. Mendoza</strong>
                      <span>Medicina General</span>
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => void quickLogin('dra.castro@fcv.test', 'Doc123*')}
                      disabled={busy}
                    >
                      <strong>❤️ Dra. S. Castro</strong>
                      <span>Cardiología (60m)</span>
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => void quickLogin('dr.ruiz@fcv.test', 'Doc123*')}
                      disabled={busy}
                    >
                      <strong>👶 Dr. A. Ruiz</strong>
                      <span>Pediatría</span>
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => void quickLogin('admin@fcv.test', 'Admin123*')}
                      disabled={busy}
                    >
                      <strong>⚙️ Administrador</strong>
                      <span>Bandeja Aprobación</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mode-switch">
                <button
                  type="button"
                  aria-pressed={mode === 'login'}
                  onClick={() => changeMode('login')}
                  disabled={busy}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'register'}
                  onClick={() => changeMode('register')}
                  disabled={busy}
                >
                  Registrarse
                </button>
              </div>

              <form onSubmit={event => void submitAuth(event)} aria-busy={busy}>
                <fieldset disabled={busy}>
                  {mode === 'register' && (
                    <>
                      <div className="field-row">
                        <label>
                          Nombres
                          <input
                            required
                            maxLength={100}
                            value={fields.firstName}
                            onChange={e => setFields(f => ({ ...f, firstName: e.target.value }))}
                          />
                        </label>
                        <label>
                          Apellidos
                          <input
                            required
                            maxLength={100}
                            value={fields.lastName}
                            onChange={e => setFields(f => ({ ...f, lastName: e.target.value }))}
                          />
                        </label>
                      </div>
                      <div className="field-row document-row">
                        <label>
                          Tipo Doc.
                          <select
                            value={fields.documentType}
                            onChange={e => setFields(f => ({ ...f, documentType: e.target.value }))}
                          >
                            <option value="CC">CC</option>
                            <option value="CE">CE</option>
                            <option value="TI">TI</option>
                            <option value="PA">Pasaporte</option>
                          </select>
                        </label>
                        <label>
                          Número de documento
                          <input
                            required
                            value={fields.documentNumber}
                            onChange={e => setFields(f => ({ ...f, documentNumber: e.target.value }))}
                          />
                        </label>
                      </div>
                      <label>
                        Teléfono
                        <input
                          type="tel"
                          required
                          value={fields.phone}
                          onChange={e => setFields(f => ({ ...f, phone: e.target.value }))}
                        />
                      </label>
                    </>
                  )}

                  <label>
                    Correo electrónico
                    <input
                      type="email"
                      required
                      placeholder="usuario@fcv.test"
                      value={fields.email}
                      onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
                    />
                  </label>

                  <label htmlFor="auth-pass">Contraseña</label>
                  <div className="password-field">
                    <input
                      id="auth-pass"
                      type={visible ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={fields.password}
                      onChange={e => setFields(f => ({ ...f, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(v => !v)}
                    >
                      {visible ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>

                  <button className="primary-button" type="submit" disabled={busy}>
                    {busy ? 'Procesando…' : mode === 'login' ? 'Entrar a mi portal' : 'Completar registro'}
                    <span>↗</span>
                  </button>
                </fieldset>
              </form>
            </div>
          </section>
        </main>
      ) : (
        /* PORTAL DE CITAS AUTENTICADO */
        <div className="portal-container">
          {/* Navegación por pestañas */}
          <nav className="nav-tabs" aria-label="Navegación del portal">
            <button
              className={`tab-btn ${tab === 'book' ? 'active' : ''}`}
              onClick={() => { setTab('book'); setError(''); setNotice(''); }}
            >
              🗓️ Agendar Cita
            </button>
            <button
              className={`tab-btn ${tab === 'my-appointments' ? 'active' : ''}`}
              onClick={() => { setTab('my-appointments'); setError(''); setNotice(''); }}
            >
              📋 Mis Citas {myAppointments.length > 0 && <span className="tab-badge">{myAppointments.length}</span>}
            </button>

            {isAdmin && (
              <button
                className={`tab-btn ${tab === 'admin-appointments' ? 'active' : ''}`}
                onClick={() => { setTab('admin-appointments'); setError(''); setNotice(''); }}
              >
                🛡️ Bandeja Admin {adminAppointments.length > 0 && <span className="tab-badge">{adminAppointments.length}</span>}
              </button>
            )}

            {isProf && (
              <>
                <button
                  className={`tab-btn ${tab === 'prof-agenda' ? 'active' : ''}`}
                  onClick={() => { setTab('prof-agenda'); setError(''); setNotice(''); }}
                >
                  🩺 Mi Agenda Médica
                </button>
                <button
                  className={`tab-btn ${tab === 'prof-blocks' ? 'active' : ''}`}
                  onClick={() => { setTab('prof-blocks'); setError(''); setNotice(''); }}
                >
                  ⏰ Mi Disponibilidad
                </button>
              </>
            )}

            <button
              className={`tab-btn ${tab === 'professionals' ? 'active' : ''}`}
              onClick={() => { setTab('professionals'); setError(''); setNotice(''); }}
            >
              👨‍⚕️ Directorio Médico
            </button>
          </nav>

          {/* CONTENIDO SEGÚN PESTAÑA */}
          <section className="portal-content">
            {/* 1. AGENDAR CITA */}
            {tab === 'book' && (
              <div>
                <div className="portal-header">
                  <h2>Agendar Nueva Cita</h2>
                  <p>Selecciona tu sede, especialidad, profesional y fecha para ver los horarios disponibles.</p>
                </div>

                <div className="booking-form-grid">
                  <div>
                    <label>Sede Hospitalaria</label>
                    <select
                      value={bookLocationId}
                      onChange={e => setBookLocationId(Number(e.target.value))}
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Especialidad</label>
                    <select
                      value={bookSpecialtyId}
                      onChange={e => {
                        const sid = Number(e.target.value);
                        setBookSpecialtyId(sid);
                        setBookProfessionalId(0);
                      }}
                    >
                      {specialties.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.appointmentDurationMinutes} min - {s.isGeneral ? 'Inmediata' : 'Requiere Admin'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Profesional Asignado</label>
                    <select
                      value={bookProfessionalId}
                      onChange={e => setBookProfessionalId(Number(e.target.value))}
                    >
                      <option value={0}>Cualquier profesional disponible</option>
                      {matchingProfs.map(p => (
                        <option key={p.id} value={p.id}>
                          Dr(a). {p.firstName} {p.lastName} ({p.professionalCode})
                        </option>
                      ))}
                    </select>
                    {matchingProfs.length === 0 && (
                      <small style={{ color: '#d97706', display: 'block', marginTop: '4px' }}>
                        ⚠️ No hay médicos asignados a esta especialidad aún. El Admin puede agregarlos en "Directorio Médico".
                      </small>
                    )}
                  </div>

                  <div>
                    <label>Fecha de Consulta</label>
                    <input
                      type="date"
                      value={bookDate}
                      onChange={e => setBookDate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  style={{ maxWidth: '280px', marginBottom: '24px' }}
                  onClick={() => void searchSlots()}
                  disabled={busy}
                >
                  🔍 Consultar Disponibilidad
                </button>

                {/* Grilla de Slots */}
                {availableSlots.length > 0 && (
                  <div>
                    <h3>Turnos disponibles ({availableSlots.length})</h3>
                    <p style={{ fontSize: '13px', color: '#64756e' }}>
                      Duración requerida: <strong>{selectedSpecObj?.appointmentDurationMinutes || 30} minutos</strong>.
                      Selecciona la franja horaria que prefieras:
                    </p>
                    <div className="slots-grid">
                      {availableSlots.map(slot => {
                        const isSel = selectedSlot?.startAt === slot.startAt && selectedSlot?.professionalId === slot.professionalId;
                        const timeStr = slot.startAt.substring(11, 16);
                        const endStr = slot.endAt.substring(11, 16);
                        const prof = professionalsList.find(p => p.id === slot.professionalId);
                        return (
                          <button
                            key={`${slot.professionalId}-${slot.startAt}`}
                            type="button"
                            className={`slot-btn ${isSel ? 'selected' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <div>{timeStr} - {endStr}</div>
                            {prof && <small style={{ fontSize: '9px', opacity: 0.85 }}>Dr(a). {prof.lastName}</small>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resumen de Confirmación */}
                {selectedSlot && (
                  <div className="booking-confirm-card">
                    <h3>Confirmar Horario</h3>
                    <div>
                      <div><strong>Fecha y Hora:</strong> {selectedSlot.startAt.replace('T', ' ')} a {selectedSlot.endAt.substring(11, 16)}</div>
                      <div><strong>Sede:</strong> {locations.find(l => l.id === selectedSlot.locationId)?.name}</div>
                      <div><strong>Especialidad:</strong> {selectedSpecObj?.name} ({selectedSpecObj?.appointmentDurationMinutes} min)</div>
                      <div><strong>Profesional:</strong> Dr(a). {professionalsList.find(p => p.id === selectedSlot.professionalId)?.firstName} {professionalsList.find(p => p.id === selectedSlot.professionalId)?.lastName}</div>
                    </div>

                    {selectedSpecObj?.isGeneral ? (
                      <div className="confirm-banner auto">
                        <span>⚡</span>
                        <span>Medicina General: Se aprobará de forma automática e inmediata (RN-02).</span>
                      </div>
                    ) : (
                      <div className="confirm-banner specialized">
                        <span>⏳</span>
                        <span>Cita Especializada: Se registrará en estado REQUESTED y el slot quedará retenido hasta que Administración la revise (RN-03).</span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void confirmBooking()}
                      disabled={busy}
                    >
                      {busy ? 'Confirmando…' : '✓ Confirmar Agendamiento'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. MIS CITAS */}
            {tab === 'my-appointments' && (
              <div>
                <div className="portal-header">
                  <h2>Mis Citas Médicas</h2>
                  <p>Historial y citas programadas con sus estados en tiempo real.</p>
                </div>

                {myAppointments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <h3>No tienes citas programadas</h3>
                    <p>Utiliza la pestaña "Agendar Cita" para buscar turnos en nuestras sedes HIC e ICV.</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {myAppointments.map(app => (
                      <div key={app.id} className="appointment-card-item">
                        <div className="card-top">
                          <div>
                            <div className="card-spec">{app.specialtyName}</div>
                            <div className="card-prof">{app.professionalName}</div>
                            <div className="card-loc">📍 {app.locationName}</div>
                          </div>
                          <span className={`status-chip ${app.statusCode.toLowerCase()}`}>
                            {app.statusName || app.statusCode}
                          </span>
                        </div>

                        <div className="card-time">
                          <span>Fecha & Hora</span>
                          <strong>{app.scheduledStartAt.replace('T', ' ')}</strong>
                        </div>

                        {app.statusCode === 'REJECTED' && app.rejectionReason && (
                          <div className="rejection-box">
                            <strong>Motivo de rechazo:</strong> {app.rejectionReason}
                          </div>
                        )}

                        {app.statusCode === 'REQUESTED' && (
                          <div style={{ fontSize: '11px', color: '#8c5b05' }}>
                            ⏳ En espera de validación administrativa.
                          </div>
                        )}

                        {(app.statusCode === 'REQUESTED' || app.statusCode === 'APPROVED') && (
                          <div className="card-actions">
                            <button
                              type="button"
                              className="btn-sm btn-danger-outline"
                              onClick={() => void cancelApp(app.id)}
                              disabled={busy}
                            >
                              Cancelar Cita
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. BANDEJA ADMIN */}
            {tab === 'admin-appointments' && isAdmin && (
              <div>
                <div className="portal-header">
                  <h2>Bandeja de Aprobaciones Administrativas</h2>
                  <p>Revisa y gestiona las solicitudes de citas especializadas (RN-03, RN-04).</p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { code: 'REQUESTED', label: '⏳ Pendientes (REQUESTED)' },
                    { code: 'APPROVED', label: '✓ Aprobadas' },
                    { code: 'REJECTED', label: '✗ Rechazadas' },
                    { code: 'COMPLETED', label: '🩺 Atendidas' },
                    { code: 'CANCELLED', label: '🚫 Canceladas' },
                    { code: 'NO_SHOW', label: '⚠️ No asistió' },
                    { code: 'ALL', label: '🌐 Todas las citas' },
                  ].map(st => (
                    <button
                      key={st.code}
                      className={`btn-sm ${adminStatusFilter === st.code ? 'primary-button' : 'btn-secondary'}`}
                      style={{ width: 'auto', margin: 0 }}
                      onClick={() => { setAdminStatusFilter(st.code); }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {adminAppointments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <h3>No hay citas en este estado</h3>
                    <p>No se encontraron registros bajo el filtro {adminStatusFilter}.</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {adminAppointments.map(app => (
                      <div key={app.id} className="appointment-card-item">
                        <div className="card-top">
                          <div>
                            <div className="card-spec">{app.specialtyName}</div>
                            <div className="card-prof">{app.professionalName}</div>
                            <div className="card-loc">📍 {app.locationName} · Paciente ID: #{app.patientUserId}</div>
                          </div>
                          <span className={`status-chip ${app.statusCode.toLowerCase()}`}>
                            {app.statusCode}
                          </span>
                        </div>

                        <div className="card-time">
                          <span>Horario Solicitado</span>
                          <strong>{app.scheduledStartAt.replace('T', ' ')}</strong>
                        </div>

                        {app.rejectionReason && (
                          <div className="rejection-box">
                            <strong>Motivo:</strong> {app.rejectionReason}
                          </div>
                        )}

                        {app.statusCode === 'REQUESTED' && (
                          <div className="card-actions">
                            <button
                              type="button"
                              className="btn-sm btn-reject"
                              onClick={() => { setRejectModalAppId(app.id); setRejectReason(''); }}
                            >
                              Rechazar
                            </button>
                            <button
                              type="button"
                              className="btn-sm btn-approve"
                              onClick={() => void approveApp(app.id)}
                            >
                              ✓ Aprobar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. AGENDA PROFESIONAL */}
            {tab === 'prof-agenda' && isProf && (
              <div>
                <div className="portal-header">
                  <h2>Mi Agenda Médica</h2>
                  <p>Citas confirmadas y atención de pacientes asignados a tu perfil.</p>
                </div>

                <div style={{ maxWidth: '240px', marginBottom: '20px' }}>
                  <label>Fecha de consulta</label>
                  <input
                    type="date"
                    value={profDate}
                    onChange={e => setProfDate(e.target.value)}
                  />
                </div>

                {profAppointments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🩺</div>
                    <h3>No hay citas programadas para {profDate}</h3>
                    <p>Revisa otra fecha o habilita bloques de disponibilidad en la pestaña correspondiente.</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {profAppointments.map(app => (
                      <div key={app.id} className="appointment-card-item">
                        <div className="card-top">
                          <div>
                            <div className="card-spec">{app.specialtyName}</div>
                            <div className="card-prof">Paciente ID: #{app.patientUserId}</div>
                            <div className="card-loc">📍 {app.locationName}</div>
                          </div>
                          <span className={`status-chip ${app.statusCode.toLowerCase()}`}>
                            {app.statusCode}
                          </span>
                        </div>

                        <div className="card-time">
                          <span>Horario</span>
                          <strong>{app.scheduledStartAt.substring(11, 16)} - {app.scheduledEndAt.substring(11, 16)}</strong>
                        </div>

                        {app.statusCode === 'APPROVED' && (
                          <div className="card-actions">
                            <button
                              type="button"
                              className="btn-sm btn-secondary"
                              onClick={() => void noShowApp(app.id)}
                            >
                              No Asistió
                            </button>
                            <button
                              type="button"
                              className="btn-sm btn-approve"
                              onClick={() => void completeApp(app.id)}
                            >
                              ✓ Marcar Atendida
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. GESTIONAR BLOQUES / DISPONIBILIDAD */}
            {tab === 'prof-blocks' && isProf && (
              <div>
                <div className="portal-header">
                  <h2>Gestión de Disponibilidad</h2>
                  <p>Publica franjas horarias que el sistema discretizará automáticamente en turnos de 30 minutos.</p>
                </div>

                <div className="booking-form-grid">
                  <div>
                    <label>Sede Habilitada</label>
                    <select
                      value={newBlockLocationId}
                      onChange={e => setNewBlockLocationId(Number(e.target.value))}
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Fecha</label>
                    <input
                      type="date"
                      value={newBlockDate}
                      onChange={e => setNewBlockDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Hora Inicio</label>
                    <input
                      type="time"
                      value={newBlockStart}
                      onChange={e => setNewBlockStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Hora Fin</label>
                    <input
                      type="time"
                      value={newBlockEnd}
                      onChange={e => setNewBlockEnd(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  style={{ maxWidth: '260px', marginBottom: '28px' }}
                  onClick={() => void createBlock()}
                  disabled={busy}
                >
                  + Publicar Bloque Horario
                </button>

                <h3>Tus bloques registrados ({profBlocks.length})</h3>
                <div className="cards-grid">
                  {profBlocks.map(b => (
                    <div key={b.id} className="appointment-card-item">
                      <div>
                        <strong>{b.availableDate}</strong>
                        <div style={{ color: '#556858', fontSize: '13px', marginTop: '4px' }}>
                          Horario: {b.startTime.substring(0, 5)} - {b.endTime.substring(0, 5)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7a887c' }}>
                          Sede: {locations.find(l => l.id === b.locationId)?.name}
                        </div>
                      </div>
                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn-sm btn-danger-outline"
                          onClick={() => void deleteBlock(b.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. DIRECTORIO MÉDICO & GESTIÓN ADMIN */}
            {tab === 'professionals' && (
              <div>
                <div className="portal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2>Directorio y Gestión de Profesionales</h2>
                    <p>Cuerpo médico registrado, especialidades activas y sedes de atención.</p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn-sm btn-approve"
                      style={{ padding: '10px 18px', fontSize: '13px' }}
                      onClick={() => setShowNewProfForm(v => !v)}
                    >
                      {showNewProfForm ? '✕ Cerrar Formulario' : '+ Registrar Nuevo Profesional (Admin)'}
                    </button>
                  )}
                </div>

                {/* Formulario Admin para crear profesional */}
                {showNewProfForm && isAdmin && (
                  <form onSubmit={e => void submitNewProf(e)} className="booking-form-grid" style={{ marginBottom: '28px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <h4 style={{ margin: '0 0 6px', color: '#173e40' }}>Registrar Nuevo Médico / Especialista (RF-07)</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#667c69' }}>Crea la cuenta de usuario, código y asigna especialidades y sedes habilitadas.</p>
                    </div>

                    <div>
                      <label>Nombres</label>
                      <input required value={newProfFirstName} onChange={e => setNewProfFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label>Apellidos</label>
                      <input required value={newProfLastName} onChange={e => setNewProfLastName(e.target.value)} />
                    </div>
                    <div>
                      <label>Tipo Doc.</label>
                      <select value={newProfDocType} onChange={e => setNewProfDocType(e.target.value)}>
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="PA">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label>Número Doc.</label>
                      <input required value={newProfDocNumber} onChange={e => setNewProfDocNumber(e.target.value)} />
                    </div>
                    <div>
                      <label>Email Profesional</label>
                      <input type="email" required placeholder="dr.apellido@fcv.test" value={newProfEmail} onChange={e => setNewProfEmail(e.target.value)} />
                    </div>
                    <div>
                      <label>Teléfono</label>
                      <input required value={newProfPhone} onChange={e => setNewProfPhone(e.target.value)} />
                    </div>
                    <div>
                      <label>Contraseña Inicial</label>
                      <input required minLength={8} value={newProfPass} onChange={e => setNewProfPass(e.target.value)} />
                    </div>
                    <div>
                      <label>Código Profesional</label>
                      <input required placeholder="PROF-DERMA-004" value={newProfCode} onChange={e => setNewProfCode(e.target.value)} />
                    </div>
                    <div>
                      <label>Matrícula Médica</label>
                      <input required placeholder="MP-99887-COL" value={newProfLicense} onChange={e => setNewProfLicense(e.target.value)} />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label>Especialidades a Asignar:</label>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', margin: '8px 0' }}>
                        {specialties.map(s => (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <input
                              type="checkbox"
                              style={{ width: 'auto', margin: 0 }}
                              checked={newProfSpecialtyIds.includes(s.id)}
                              onChange={e => {
                                if (e.target.checked) setNewProfSpecialtyIds(prev => [...prev, s.id]);
                                else setNewProfSpecialtyIds(prev => prev.filter(id => id !== s.id));
                              }}
                            />
                            {s.name} ({s.appointmentDurationMinutes}m)
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label>Sedes Habilitadas:</label>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', margin: '8px 0' }}>
                        {locations.map(l => (
                          <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <input
                              type="checkbox"
                              style={{ width: 'auto', margin: 0 }}
                              checked={newProfLocationIds.includes(l.id)}
                              onChange={e => {
                                if (e.target.checked) setNewProfLocationIds(prev => [...prev, l.id]);
                                else setNewProfLocationIds(prev => prev.filter(id => id !== l.id));
                              }}
                            />
                            {l.name} ({l.code})
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" className="primary-button" style={{ maxWidth: '280px' }} disabled={busy}>
                        {busy ? 'Guardando…' : '✓ Guardar Profesional'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="cards-grid">
                  {professionalsList.map(p => (
                    <div key={p.id} className="appointment-card-item">
                      <div>
                        <div className="card-spec">Dr(a). {p.firstName} {p.lastName}</div>
                        <div style={{ fontSize: '12px', color: '#556858', marginBottom: '8px' }}>
                          Código: <strong>{p.professionalCode}</strong> · Matrícula: {p.licenseNumber}
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          <strong>Especialidades:</strong>
                          <ul style={{ margin: '4px 0 8px 18px', padding: 0 }}>
                            {p.specialties.map(s => (
                              <li key={s.id}>{s.name} ({s.appointmentDurationMinutes} min)</li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          <strong>Sedes de atención:</strong>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {p.locations.map(l => (
                              <span key={l.id} className="role-pill">📍 {l.code}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal Rechazo Admin */}
      {rejectModalAppId && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <h3>Motivo de Rechazo de Solicitud</h3>
            <p style={{ fontSize: '13px', color: '#64756e' }}>
              De acuerdo con la regla RN-04, todo rechazo administrativo de una cita especializada requiere un motivo explícito.
            </p>
            <textarea
              required
              placeholder="Ej: El paciente requiere remisión previa o examen complementario..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() => setRejectModalAppId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-sm btn-reject"
                onClick={() => void confirmReject()}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        <span>FCV Citas · Entorno de Laboratorio Académico</span>
        <span>Sede HIC: Km 7 Autopista Bucaramanga-Piedecuesta · Sede ICV: Floridablanca</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
