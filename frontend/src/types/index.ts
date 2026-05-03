export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'admin' | 'teacher' | 'student';
  avatar?: string;
  studentId?: string;
  department?: string;
  status: string;
  mfaEnabled: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Course {
  id: number;
  teacher?: User;
  courseCode: string;
  courseName: string;
  description?: string;
  joinCode: string;
  section?: string;
  schedule?: string;
  room?: string;
  coverColor: string;
  status: string;
  createdAt: string;
}

export interface Enrollment {
  id: number;
  student: User;
  course: Course;
  enrolledAt: string;
  status: string;
}

export interface AttendanceSession {
  id: number;
  course: Course;
  sessionTitle?: string;
  attendanceCode: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  status: string;
  allowLate: boolean;
  lateMinutes: number;
}

export interface AttendanceRecord {
  id: number;
  session: AttendanceSession;
  student: User;
  status: 'present' | 'late' | 'absent' | 'excused';
  submittedAt: string;
  notes?: string;
}

export interface CourseMaterial {
  id: number;
  course: Course;
  title: string;
  description?: string;
  type: 'file' | 'link' | 'announcement' | 'assignment';
  filePath?: string;
  fileName?: string;
  externalLink?: string;
  dueDate?: string;
  isPinned: boolean;
  isClosed: boolean;
  createdAt: string;
}

export interface Message {
  id: number;
  sender: User;
  receiver: User;
  subject?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'video' | 'file';
  attachmentSize?: number;
}

export interface AuditLog {
  id: number;
  user?: User;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}
