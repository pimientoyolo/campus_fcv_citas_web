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
  UserProfile,
  UserAffiliation,
  AppointmentReschedule,
  Regimen,
  Eps,
  EpsPlan,
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

type PortalTab =
  | 'book'
  | 'my-appointments'
  | 'profile'
  | 'admin-appointments'
  | 'admin-reschedules'
  | 'admin-catalogs'
  | 'prof-agenda'
  | 'prof-blocks'
  | 'professionals';

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
  const [bookProfessionalId, setBookProfessionalId] = useState<number>(0);
  const [bookDate, setBookDate] = useState<string>('2026-10-01');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Modal Rechazo Admin Citas
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

  // S4: Recuperación de Contraseña (RF-03, HU-007)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  // S4: Perfil y Afiliaciones (RF-04, HU-008)
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [affiliations, setAffiliations] = useState<UserAffiliation[]>([]);
  const [editPhone, setEditPhone] = useState('');
  const [regimensList, setRegimensList] = useState<Regimen[]>([]);
  const [epsList, setEpsList] = useState<Eps[]>([]);
  const [epsPlansList, setEpsPlansList] = useState<EpsPlan[]>([]);
  const [newAffRegimenId, setNewAffRegimenId] = useState<number>(1);
  const [newAffEpsId, setNewAffEpsId] = useState<number>(1);
  const [newAffPlanId, setNewAffPlanId] = useState<number>(1);

  // S4: Reprogramación de Citas (RF-15, HU-009)
  const [rescheduleModalApp, setRescheduleModalApp] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('2026-10-10');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // S4: Bandeja de Reprogramaciones Admin (RF-18, HU-009)
  const [pendingReschedules, setPendingReschedules] = useState<AppointmentReschedule[]>([]);
  const [rejectRescheduleId, setRejectRescheduleId] = useState<number | null>(null);
  const [rescheduleRejectReason, setRescheduleRejectReason] = useState('');

  // S4: Catálogos Configurables (RF-06, HU-010)
  const [adminEpsList, setAdminEpsList] = useState<Eps[]>([]);
  const [selectedAdminEpsId, setSelectedAdminEpsId] = useState<number>(1);
  const [adminPlansList, setAdminPlansList] = useState<EpsPlan[]>([]);
  const [newEpsCode, setNewEpsCode] = useState('');
  const [newEpsName, setNewEpsName] = useState('');
  const [newPlanCode, setNewPlanCode] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newSpecCode, setNewSpecCode] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecDuration, setNewSpecDuration] = useState(30);
  const [newSpecIsGeneral, setNewSpecIsGeneral] = useState(false);

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
    } else if (tab === 'profile') {
      loadProfileAndAffiliations();
    } else if (tab === 'admin-reschedules') {
      loadPendingReschedules();
    } else if (tab === 'admin-catalogs') {
      loadAdminCatalogs();
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

  function loadProfileAndAffiliations() {
    if (!session) return;
    api.getProfile(session.accessToken)
      .then(p => {
        setProfile(p);
        setEditPhone(p.phone);
      })
      .catch(() => {});
    api.getAffiliations(session.accessToken)
      .then(setAffiliations)
      .catch(() => {});
    api.regimens().then(setRegimensList).catch(() => {});
    api.epsList().then(list => {
      setEpsList(list);
      if (list.length > 0) {
        setNewAffEpsId(list[0].id);
        api.epsPlans(list[0].id).then(plans => {
          setEpsPlansList(plans);
          if (plans.length > 0) setNewAffPlanId(plans[0].id);
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  function onSelectAffEps(epsId: number) {
    setNewAffEpsId(epsId);
    api.epsPlans(epsId).then(plans => {
      setEpsPlansList(plans);
      if (plans.length > 0) setNewAffPlanId(plans[0].id);
    }).catch(() => {});
  }

  function loadPendingReschedules() {
    if (!session) return;
    api.pendingReschedules(session.accessToken)
      .then(setPendingReschedules)
      .catch(err => setError(err.message));
  }

  function loadAdminCatalogs() {
    api.epsList().then(list => {
      setAdminEpsList(list);
      if (list.length > 0) {
        setSelectedAdminEpsId(list[0].id);
        api.epsPlans(list[0].id).then(setAdminPlansList).catch(() => {});
      }
    }).catch(() => {});
    api.specialties().then(setSpecialties).catch(() => {});
  }

  function onSelectAdminEps(epsId: number) {
    setSelectedAdminEpsId(epsId);
    api.epsPlans(epsId).then(setAdminPlansList).catch(() => {});
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
      if (next.user.roles.includes('ADMIN')) setTab('admin-appointments');
      else if (next.user.roles.includes('PROFESSIONAL')) setTab('prof-agenda');
      else setTab('book');
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

  // --- Operaciones de Admin Citas ---
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

  // --- S4: Recuperación de Contraseña ---
  async function handleRequestReset(e: FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.requestPasswordReset(resetEmail.trim().toLowerCase());
      setNotice(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      setResetStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar restablecimiento.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReset(e: FormEvent) {
    e.preventDefault();
    if (!resetToken.trim() || !newResetPassword) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.confirmPasswordReset(resetToken.trim(), newResetPassword);
      setNotice(res.message + ' ¡Ya puedes iniciar sesión!');
      setShowResetModal(false);
      setResetEmail('');
      setResetToken('');
      setNewResetPassword('');
      setResetStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer contraseña.');
    } finally {
      setBusy(false);
    }
  }

  // --- S4: Perfil y Afiliaciones ---
  async function handleUpdatePhone(e: FormEvent) {
    e.preventDefault();
    if (!session || !profile) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: editPhone.trim(),
      }, session.accessToken);
      setProfile(updated);
      setNotice('Teléfono actualizado exitosamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar teléfono.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAffiliation(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      await api.createAffiliation({
        epsId: newAffEpsId,
        epsPlanId: newAffPlanId,
        regimenId: newAffRegimenId,
      }, session.accessToken);
      setNotice('Afiliación de salud registrada exitosamente.');
      loadProfileAndAffiliations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al vincular afiliación.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAffiliation(affId: number) {
    if (!session || !confirm('¿Eliminar esta afiliación?')) return;
    setBusy(true);
    try {
      await api.deleteAffiliation(affId, session.accessToken);
      setNotice('Afiliación eliminada.');
      loadProfileAndAffiliations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar afiliación.');
    } finally {
      setBusy(false);
    }
  }

  // --- S4: Reprogramaciones ---
  async function handleSendReschedule(e: FormEvent) {
    e.preventDefault();
    if (!session || !rescheduleModalApp) return;
    const newStartAt = `${rescheduleDate}T${rescheduleTime}:00`;
    setBusy(true);
    setError('');
    try {
      await api.rescheduleAppointment(rescheduleModalApp.id, {
        newStartAt,
        reason: rescheduleReason.trim(),
      }, session.accessToken);
      setNotice('Solicitud de reprogramación registrada con éxito. Queda en estado PENDING y será revisada por Administración.');
      setRescheduleModalApp(null);
      setRescheduleReason('');
      loadMyAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar reprogramación.');
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveReschedule(resId: number) {
    if (!session) return;
    setBusy(true);
    try {
      await api.approveReschedule(resId, session.accessToken);
      setNotice('Reprogramación aprobada y fecha de la cita actualizada exitosamente.');
      loadPendingReschedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar reprogramación.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRejectReschedule() {
    if (!session || !rejectRescheduleId) return;
    if (!rescheduleRejectReason.trim()) {
      setError('Debes especificar un motivo para rechazar la reprogramación.');
      return;
    }
    setBusy(true);
    try {
      await api.rejectReschedule(rejectRescheduleId, rescheduleRejectReason.trim(), session.accessToken);
      setNotice('Solicitud de reprogramación rechazada. La cita original se mantiene.');
      setRejectRescheduleId(null);
      setRescheduleRejectReason('');
      loadPendingReschedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar reprogramación.');
    } finally {
      setBusy(false);
    }
  }

  // --- S4: Gestión de Catálogos (Admin) ---
  async function handleCreateEps(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    try {
      await api.createEps({ code: newEpsCode.trim(), name: newEpsName.trim() }, session.accessToken);
      setNotice('EPS creada exitosamente.');
      setNewEpsCode('');
      setNewEpsName('');
      loadAdminCatalogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear EPS.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleEps(eps: Eps) {
    if (!session) return;
    setBusy(true);
    try {
      await api.toggleEpsActive(eps.id, !eps.active, session.accessToken);
      setNotice(`EPS ${eps.name} ${!eps.active ? 'activada' : 'desactivada'}.`);
      loadAdminCatalogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al alternar estado de EPS.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePlan(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    try {
      await api.createEpsPlan(selectedAdminEpsId, { code: newPlanCode.trim(), name: newPlanName.trim() }, session.accessToken);
      setNotice('Plan EPS creado exitosamente.');
      setNewPlanCode('');
      setNewPlanName('');
      api.epsPlans(selectedAdminEpsId).then(setAdminPlansList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear Plan.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSpecialty(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    try {
      await api.createSpecialty({
        code: newSpecCode.trim(),
        name: newSpecName.trim(),
        appointmentDurationMinutes: Number(newSpecDuration),
        isGeneral: newSpecIsGeneral,
        requiresAdminApproval: !newSpecIsGeneral,
      }, session.accessToken);
      setNotice('Especialidad creada exitosamente.');
      setNewSpecCode('');
      setNewSpecName('');
      setNewSpecDuration(30);
      setNewSpecIsGeneral(false);
      loadCatalogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear Especialidad.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleSpecialty(spec: Specialty) {
    if (!session) return;
    setBusy(true);
    try {
      await api.toggleSpecialtyActive(spec.id, !spec.active, session.accessToken);
      setNotice(`Especialidad ${spec.name} ${!spec.active ? 'activada' : 'desactivada'}.`);
      loadCatalogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al alternar estado de Especialidad.');
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
          <span className="lab-badge"><span /> Entorno FCV Citas S4</span>
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

                  {mode === 'login' && (
                    <div style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="forgot-link-btn"
                        onClick={() => { setShowResetModal(true); setResetStep(1); setError(''); }}
                      >
                        ¿Olvidaste tu contraseña? (RF-03)
                      </button>
                    </div>
                  )}

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
            <button
              className={`tab-btn ${tab === 'profile' ? 'active' : ''}`}
              onClick={() => { setTab('profile'); setError(''); setNotice(''); }}
            >
              👤 Mi Perfil y EPS
            </button>

            {isAdmin && (
              <>
                <button
                  className={`tab-btn ${tab === 'admin-appointments' ? 'active' : ''}`}
                  onClick={() => { setTab('admin-appointments'); setError(''); setNotice(''); }}
                >
                  🛡️ Bandeja Citas {adminAppointments.length > 0 && <span className="tab-badge">{adminAppointments.length}</span>}
                </button>
                <button
                  className={`tab-btn ${tab === 'admin-reschedules' ? 'active' : ''}`}
                  onClick={() => { setTab('admin-reschedules'); setError(''); setNotice(''); }}
                >
                  🔄 Reprogramaciones {pendingReschedules.length > 0 && <span className="tab-badge">{pendingReschedules.length}</span>}
                </button>
                <button
                  className={`tab-btn ${tab === 'admin-catalogs' ? 'active' : ''}`}
                  onClick={() => { setTab('admin-catalogs'); setError(''); setNotice(''); }}
                >
                  ⚙️ Catálogos
                </button>
              </>
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
                              className="btn-sm btn-secondary"
                              onClick={() => {
                                setRescheduleModalApp(app);
                                setRescheduleReason('');
                              }}
                              disabled={busy}
                            >
                              🔄 Reprogramar (RF-15)
                            </button>
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

            {/* 3. MI PERFIL Y AFILIACIONES (RF-04, HU-008) */}
            {tab === 'profile' && (
              <div>
                <div className="portal-header">
                  <h2>Mi Perfil y Afiliación de Salud</h2>
                  <p>Administra tus datos personales y tus vinculaciones a EPS y regímenes (RF-04).</p>
                </div>

                {profile && (
                  <div className="profile-card">
                    <h3>Datos Personales</h3>
                    <div className="profile-row">
                      <div className="profile-field">
                        <label>Nombre Completo</label>
                        <div>{profile.firstName} {profile.lastName}</div>
                      </div>
                      <div className="profile-field">
                        <label>Documento de Identidad</label>
                        <div>{profile.documentType} {profile.documentNumber}</div>
                      </div>
                      <div className="profile-field">
                        <label>Correo Electrónico</label>
                        <div>{profile.email}</div>
                      </div>
                    </div>

                    <form onSubmit={e => void handleUpdatePhone(e)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '400px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                          Teléfono de Contacto
                        </label>
                        <input
                          type="tel"
                          required
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn-sm btn-approve" style={{ padding: '10px 16px' }} disabled={busy}>
                        Guardar Teléfono
                      </button>
                    </form>
                  </div>
                )}

                <div className="catalog-section">
                  <h3>Mis Afiliaciones de Salud Activas ({affiliations.length})</h3>
                  {affiliations.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      No tienes afiliaciones registradas. Vincula tu EPS y Plan a continuación.
                    </p>
                  ) : (
                    <table className="catalog-table">
                      <thead>
                        <tr>
                          <th>Régimen</th>
                          <th>EPS</th>
                          <th>Plan</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliations.map(aff => (
                          <tr key={aff.id}>
                            <td><strong>{aff.regimenName}</strong></td>
                            <td>{aff.epsName}</td>
                            <td>{aff.epsPlanName}</td>
                            <td><span className="badge-active">ACTIVA</span></td>
                            <td>
                              <button
                                type="button"
                                className="btn-sm btn-danger-outline"
                                onClick={() => void handleDeleteAffiliation(aff.id)}
                              >
                                Desvincular
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #edf2eb' }} />

                  <h4>+ Vincular Nueva Afiliación</h4>
                  <form onSubmit={e => void handleCreateAffiliation(e)} className="booking-form-grid" style={{ marginBottom: 0 }}>
                    <div>
                      <label>Régimen</label>
                      <select
                        value={newAffRegimenId}
                        onChange={e => setNewAffRegimenId(Number(e.target.value))}
                      >
                        {regimensList.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Entidad EPS</label>
                      <select
                        value={newAffEpsId}
                        onChange={e => onSelectAffEps(Number(e.target.value))}
                      >
                        {epsList.map(eps => (
                          <option key={eps.id} value={eps.id}>{eps.name} ({eps.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Plan de Salud</label>
                      <select
                        value={newAffPlanId}
                        onChange={e => setNewAffPlanId(Number(e.target.value))}
                      >
                        {epsPlansList.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="primary-button" style={{ margin: 0 }} disabled={busy}>
                        + Vincular Afiliación
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 4. BANDEJA ADMIN CITAS */}
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

            {/* 5. BANDEJA ADMIN REPROGRAMACIONES (RF-18, HU-009) */}
            {tab === 'admin-reschedules' && isAdmin && (
              <div>
                <div className="portal-header">
                  <h2>Gestión de Solicitudes de Reprogramación</h2>
                  <p>Evalúa las solicitudes de cambio de horario presentadas por los pacientes (RF-18).</p>
                </div>

                {pendingReschedules.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <h3>No hay reprogramaciones pendientes</h3>
                    <p>Todas las solicitudes han sido resueltas oportunamente.</p>
                  </div>
                ) : (
                  <div className="cards-grid">
                    {pendingReschedules.map(res => (
                      <div key={res.id} className="appointment-card-item">
                        <div className="card-top">
                          <div>
                            <div className="card-spec">Cita ID: #{res.appointmentId}</div>
                            <div className="card-prof">Solicitado por Paciente ID: #{res.requestedByUserId}</div>
                          </div>
                          <span className="status-chip requested">PENDING</span>
                        </div>

                        <div className="card-time" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                          <div>Horario Actual: <s>{res.oldStartAt.replace('T', ' ')}</s></div>
                          <div>Nuevo Horario Solicitado: <strong>{res.newStartAt.replace('T', ' ')}</strong></div>
                        </div>

                        <div style={{ fontSize: '13px', background: '#f8faf6', padding: '8px 12px', borderRadius: '6px' }}>
                          <strong>Motivo:</strong> {res.reason}
                        </div>

                        <div className="card-actions">
                          <button
                            type="button"
                            className="btn-sm btn-reject"
                            onClick={() => { setRejectRescheduleId(res.id); setRescheduleRejectReason(''); }}
                            disabled={busy}
                          >
                            Rechazar
                          </button>
                          <button
                            type="button"
                            className="btn-sm btn-approve"
                            onClick={() => void handleApproveReschedule(res.id)}
                            disabled={busy}
                          >
                            ✓ Aprobar Reprogramación
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. ADMIN CATÁLOGOS CONFIGURABLES (RF-06, HU-010) */}
            {tab === 'admin-catalogs' && isAdmin && (
              <div>
                <div className="portal-header">
                  <h2>Catálogos Configurables del Sistema</h2>
                  <p>Administración y parametrización de Entidades EPS, Planes de Atención y Especialidades Médicas (RF-06).</p>
                </div>

                {/* Subsección EPS y Planes */}
                <div className="catalog-section">
                  <h3>1. Entidades EPS</h3>
                  <table className="catalog-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Código</th>
                        <th>Nombre de la Entidad</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminEpsList.map(eps => (
                        <tr key={eps.id} style={{ background: selectedAdminEpsId === eps.id ? '#f0f9eb' : 'transparent' }}>
                          <td>#{eps.id}</td>
                          <td><code>{eps.code}</code></td>
                          <td><strong>{eps.name}</strong></td>
                          <td>
                            <span className={eps.active ? 'badge-active' : 'badge-inactive'}>
                              {eps.active ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-sm btn-secondary"
                              onClick={() => onSelectAdminEps(eps.id)}
                            >
                              Ver Planes
                            </button>
                            <button
                              type="button"
                              className={`btn-sm ${eps.active ? 'btn-danger-outline' : 'btn-approve'}`}
                              onClick={() => void handleToggleEps(eps)}
                            >
                              {eps.active ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4 style={{ marginTop: '20px' }}>+ Registrar Nueva Entidad EPS</h4>
                  <form onSubmit={e => void handleCreateEps(e)} className="booking-form-grid">
                    <div>
                      <label>Código EPS (ej: EPS-SURA)</label>
                      <input required value={newEpsCode} onChange={e => setNewEpsCode(e.target.value)} placeholder="EPS-NUEVA" />
                    </div>
                    <div>
                      <label>Nombre de la EPS</label>
                      <input required value={newEpsName} onChange={e => setNewEpsName(e.target.value)} placeholder="EPS Salud Total" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="primary-button" style={{ margin: 0 }} disabled={busy}>
                        + Crear EPS
                      </button>
                    </div>
                  </form>

                  <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #edf2eb' }} />

                  <h3>2. Planes de Salud para: {adminEpsList.find(e => e.id === selectedAdminEpsId)?.name || 'Selecciona una EPS'}</h3>
                  <table className="catalog-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Código Plan</th>
                        <th>Nombre del Plan</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPlansList.map(plan => (
                        <tr key={plan.id}>
                          <td>#{plan.id}</td>
                          <td><code>{plan.code}</code></td>
                          <td>{plan.name}</td>
                          <td><span className="badge-active">ACTIVO</span></td>
                        </tr>
                      ))}
                      {adminPlansList.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: '#64756e' }}>No hay planes registrados para esta EPS.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <h4 style={{ marginTop: '20px' }}>+ Agregar Plan a esta EPS</h4>
                  <form onSubmit={e => void handleCreatePlan(e)} className="booking-form-grid">
                    <div>
                      <label>Código del Plan</label>
                      <input required value={newPlanCode} onChange={e => setNewPlanCode(e.target.value)} placeholder="PLAN-PREF" />
                    </div>
                    <div>
                      <label>Nombre del Plan</label>
                      <input required value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="Plan Preferencial Plus" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="primary-button" style={{ margin: 0 }} disabled={busy}>
                        + Crear Plan
                      </button>
                    </div>
                  </form>
                </div>

                {/* Subsección Especialidades */}
                <div className="catalog-section">
                  <h3>3. Especialidades Médicas Configurables</h3>
                  <table className="catalog-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre Especialidad</th>
                        <th>Duración</th>
                        <th>Tipo Aprobación</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specialties.map(spec => (
                        <tr key={spec.id}>
                          <td><code>{spec.code}</code></td>
                          <td><strong>{spec.name}</strong></td>
                          <td>{spec.appointmentDurationMinutes} min</td>
                          <td>
                            {spec.isGeneral ? (
                              <span className="badge-active">Inmediata (General)</span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>Requiere Aprobación Admin</span>
                            )}
                          </td>
                          <td>
                            <span className={spec.active ? 'badge-active' : 'badge-inactive'}>
                              {spec.active ? 'ACTIVA' : 'INACTIVA'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`btn-sm ${spec.active ? 'btn-danger-outline' : 'btn-approve'}`}
                              onClick={() => void handleToggleSpecialty(spec)}
                            >
                              {spec.active ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4 style={{ marginTop: '20px' }}>+ Registrar Nueva Especialidad</h4>
                  <form onSubmit={e => void handleCreateSpecialty(e)} className="booking-form-grid">
                    <div>
                      <label>Código (ej: DERMA)</label>
                      <input required value={newSpecCode} onChange={e => setNewSpecCode(e.target.value)} placeholder="DERMA" />
                    </div>
                    <div>
                      <label>Nombre de la Especialidad</label>
                      <input required value={newSpecName} onChange={e => setNewSpecName(e.target.value)} placeholder="Dermatología Clínica" />
                    </div>
                    <div>
                      <label>Duración del Turno (minutos)</label>
                      <input
                        type="number"
                        min={15}
                        max={120}
                        step={15}
                        required
                        value={newSpecDuration}
                        onChange={e => setNewSpecDuration(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '24px' }}>
                        <input
                          type="checkbox"
                          style={{ width: 'auto' }}
                          checked={newSpecIsGeneral}
                          onChange={e => setNewSpecIsGeneral(e.target.checked)}
                        />
                        <span>¿Es Medicina General? (Aprobación Inmediata)</span>
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="primary-button" style={{ margin: 0 }} disabled={busy}>
                        + Crear Especialidad
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 7. AGENDA PROFESIONAL */}
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

            {/* 8. GESTIONAR BLOQUES / DISPONIBILIDAD */}
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

            {/* 9. DIRECTORIO MÉDICO & GESTIÓN ADMIN */}
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

      {/* Modal Rechazo Admin Citas */}
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

      {/* Modal Reprogramación de Cita (Paciente - RF-15) */}
      {rescheduleModalApp && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <h3>Solicitud de Reprogramación</h3>
            <p style={{ fontSize: '13px', color: '#64756e' }}>
              Indica la nueva fecha y hora tentativa en la que deseas atender tu cita ({rescheduleModalApp.specialtyName} con {rescheduleModalApp.professionalName}).
            </p>
            <form onSubmit={e => void handleSendReschedule(e)}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Nueva Fecha Deseada</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Nueva Hora Deseada</label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                  />
                </div>
              </div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Motivo de la reprogramación:</label>
              <textarea
                required
                placeholder="Ej: Compromiso laboral imprevisto o viaje programado..."
                value={rescheduleReason}
                onChange={e => setRescheduleReason(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  onClick={() => setRescheduleModalApp(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-sm btn-approve"
                  disabled={busy}
                >
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rechazo Reprogramación Admin */}
      {rejectRescheduleId && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <h3>Motivo de Rechazo de Reprogramación</h3>
            <p style={{ fontSize: '13px', color: '#64756e' }}>
              Indica el motivo por el cual no es posible aceptar el cambio de horario propuesto por el paciente.
            </p>
            <textarea
              required
              placeholder="Ej: El médico no cuenta con turnos disponibles en ese horario..."
              value={rescheduleRejectReason}
              onChange={e => setRescheduleRejectReason(e.target.value)}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() => setRejectRescheduleId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-sm btn-reject"
                onClick={() => void handleRejectReschedule()}
                disabled={busy}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recuperación de Contraseña (RF-03, HU-007) */}
      {showResetModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <h3>Recuperación de Contraseña</h3>
            {resetStep === 1 ? (
              <form onSubmit={e => void handleRequestReset(e)}>
                <p style={{ fontSize: '13px', color: '#64756e' }}>
                  Ingresa tu correo electrónico registrado. En este entorno de laboratorio se generará un token de recuperación sintético.
                </p>
                <label>Correo electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="paciente@fcv.test"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    onClick={() => setShowResetModal(false)}
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    style={{ margin: 0, width: 'auto' }}
                    disabled={busy}
                  >
                    Generar Token ↗
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={e => void handleConfirmReset(e)}>
                <p style={{ fontSize: '13px', color: '#64756e' }}>
                  Ingresa el token de verificación y define tu nueva contraseña segura.
                </p>
                <label>Token de Recuperación</label>
                <input
                  required
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  placeholder="Token de 36 caracteres..."
                />
                <label>Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newResetPassword}
                  onChange={e => setNewResetPassword(e.target.value)}
                />
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    onClick={() => setResetStep(1)}
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    style={{ margin: 0, width: 'auto' }}
                    disabled={busy}
                  >
                    ✓ Restablecer Contraseña
                  </button>
                </div>
              </form>
            )}
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
