export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface Registration {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  password: string;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  address: string;
  active: boolean;
}

export interface Specialty {
  id: number;
  code: string;
  name: string;
  appointmentDurationMinutes: number;
  isGeneral: boolean;
  requiresAdminApproval: boolean;
  active: boolean;
}

export interface AppointmentStatus {
  id: number;
  code: string;
  name: string;
  isTerminal: boolean;
}

export interface Professional {
  id: number;
  userId: number;
  professionalCode: string;
  licenseNumber: string;
  active: boolean;
  firstName: string;
  lastName: string;
  email: string;
  specialties: Specialty[];
  locations: Location[];
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
  professionalId: number;
  locationId: number;
  specialtyId: number;
}

export interface Appointment {
  id: number;
  patientUserId: number;
  professionalId: number;
  professionalName: string;
  locationId: number;
  locationName: string;
  specialtyId: number;
  specialtyName: string;
  statusId: number;
  statusCode: string;
  statusName: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface AvailabilityBlock {
  id: number;
  professionalId: number;
  locationId: number;
  availableDate: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

async function request<T>(path: string, method: string = 'GET', body?: unknown, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError('No pudimos conectar con el servicio. Revisa tu conexión o que los contenedores estén activos.', 0);
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.message || `Error del servidor (${response.status}). Inténtalo nuevamente.`, response.status);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  // Auth
  register: (data: Registration) => request<User>('/api/auth/register', 'POST', data),
  login: (email: string, password: string) => request<Session>('/api/auth/login', 'POST', { email, password }),
  refresh: (refreshToken: string) => request<Session>('/api/auth/refresh', 'POST', { refreshToken }),
  me: (token: string) => request<User>('/api/auth/me', 'GET', undefined, token),
  logout: (token: string) => request<void>('/api/auth/logout', 'POST', {}, token),

  // Catálogos
  locations: () => request<Location[]>('/api/catalogs/locations'),
  specialties: () => request<Specialty[]>('/api/catalogs/specialties'),
  statuses: () => request<AppointmentStatus[]>('/api/catalogs/appointment-statuses'),

  // Profesionales
  professionals: (filters?: { active?: boolean; specialtyId?: number; locationId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.set('active', String(filters.active));
    if (filters?.specialtyId) params.set('specialtyId', String(filters.specialtyId));
    if (filters?.locationId) params.set('locationId', String(filters.locationId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<Professional[]>(`/api/professionals${qs}`);
  },
  createProfessional: (
    data: {
      firstName: string;
      lastName: string;
      documentType: string;
      documentNumber: string;
      email: string;
      phone: string;
      password: string;
      professionalCode: string;
      licenseNumber: string;
      specialtyIds: number[];
      locationIds: number[];
    },
    token: string
  ) => request<Professional>('/api/professionals', 'POST', data, token),

  // Disponibilidad
  availability: (params: { locationId?: number; specialtyId: number; professionalId?: number; date: string }) => {
    const qs = new URLSearchParams();
    if (params.locationId) qs.set('locationId', String(params.locationId));
    qs.set('specialtyId', String(params.specialtyId));
    if (params.professionalId) qs.set('professionalId', String(params.professionalId));
    qs.set('date', params.date);
    return request<AvailableSlot[]>(`/api/availability?${qs.toString()}`);
  },

  // Citas (Paciente)
  bookAppointment: (
    data: { professionalId: number; locationId: number; specialtyId: number; startAt: string },
    token: string
  ) => request<Appointment>('/api/appointments', 'POST', data, token),

  myAppointments: (token: string) => request<Appointment[]>('/api/appointments/my-appointments', 'GET', undefined, token),
  cancelAppointment: (id: number, token: string) => request<Appointment>(`/api/appointments/${id}/cancel`, 'PATCH', {}, token),

  // Citas (Admin)
  adminAppointments: (
    filters: { statusId?: number; locationId?: number; professionalId?: number; date?: string },
    token: string
  ) => {
    const qs = new URLSearchParams();
    if (filters.statusId) qs.set('statusId', String(filters.statusId));
    if (filters.locationId) qs.set('locationId', String(filters.locationId));
    if (filters.professionalId) qs.set('professionalId', String(filters.professionalId));
    if (filters.date) qs.set('date', filters.date);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request<Appointment[]>(`/api/admin/appointments${query}`, 'GET', undefined, token);
  },
  approveAppointment: (id: number, token: string) => request<Appointment>(`/api/admin/appointments/${id}/approve`, 'PATCH', {}, token),
  rejectAppointment: (id: number, reason: string, token: string) =>
    request<Appointment>(`/api/admin/appointments/${id}/reject`, 'PATCH', { reason }, token),

  // Citas (Profesional)
  professionalAppointments: (date?: string, token?: string) => {
    const qs = date ? `?date=${date}` : '';
    return request<Appointment[]>(`/api/professional/appointments${qs}`, 'GET', undefined, token);
  },
  completeAppointment: (id: number, token: string) =>
    request<Appointment>(`/api/professional/appointments/${id}/complete`, 'PATCH', {}, token),
  noShowAppointment: (id: number, reason: string | undefined, token: string) =>
    request<Appointment>(`/api/professional/appointments/${id}/no-show`, 'PATCH', { reason }, token),

  // Bloques de disponibilidad (Profesional / Admin)
  getBlocks: (professionalId: number, token: string) =>
    request<AvailabilityBlock[]>(`/api/professionals/${professionalId}/blocks`, 'GET', undefined, token),
  createBlock: (
    professionalId: number,
    data: { locationId: number; date: string; startTime: string; endTime: string },
    token: string
  ) => request<AvailabilityBlock>(`/api/professionals/${professionalId}/blocks`, 'POST', data, token),
  deleteBlock: (professionalId: number, blockId: number, token: string) =>
    request<void>(`/api/professionals/${professionalId}/blocks/${blockId}`, 'DELETE', undefined, token),
};
