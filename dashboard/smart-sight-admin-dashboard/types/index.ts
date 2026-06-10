export type VisionType = "БҮРЭН" | "ХАГАС" | "БУСАД"
export type Device = "iOS" | "Android"
export type UserStatus = "Active" | "Inactive"
export type AlertSeverity = "ЯАРАЛТАЙ" | "АНХААРУУЛГА" | "МЭДЭЭЛЭЛ"

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  visionType: VisionType
  device: Device
  lastActive: string // ISO date
  totalSessions: number
  status: UserStatus
  city: string
  joinedAt: string
}

export interface Alert {
  id: string
  timestamp: string // ISO date
  userId: string
  userName: string
  severity: AlertSeverity
  object: string // detected object (Mongolian)
  distance: number // meters
  location: string
  sessionId: string
}

export interface SessionDetection {
  time: string
  object: string
  severity: AlertSeverity
  distance: number
}

export interface Session {
  id: string
  userId: string
  userName: string
  startTime: string // ISO date
  durationMin: number
  alertsCount: number
  device: Device
  detections: SessionDetection[]
}
