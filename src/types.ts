export interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  weddingDate: string; // YYYY-MM-DD
  venue: string;
  packageName: string; // e.g. "Classic Gold", "Diamond", etc.
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress';
  type: 'production' | 'freelancer';
  photographer: string; // Main studio or Freelancer name
  leadCinematographer?: string; // Lead Cinematographer name
  notes: string;
  createdAt: number;
  updatedAt?: number;
  userId?: string;
  freelancerRate?: number; // Only applicable/visible for freelancer bookings
  freelancerPhone?: string;
  brideName?: string;
  groomName?: string;
  eventTime?: string;
  reportingTime?: string;
  whatsappStatus?: 'none' | 'sent' | 'failed';
  whatsappHistory?: Array<{ id: string; timestamp: number; status: 'sent' | 'failed'; message: string; recipientPhone: string }>;
  assignedFreelancers?: string[];
  freelancerAssignments?: FreelancerAssignment[];
  bookingFor?: string; // e.g. Wedding, Reception, Pre Wedding, Engagement, Other
  coverage?: string; // e.g. Bride Side, Groom Side, Both Side
  
  // Client Portal & Tracking Fields
  photographyStatus?: string;
  videographyStatus?: string;
  photoEditingStatus?: string;
  videoEditingStatus?: string;
  clientPhotoSelectionStatus?: string;
  albumDesigningStatus?: string;
  albumPrintingStatus?: string;
  albumDeliveryStatus?: string;
  videoDeliveryStatus?: string;
  projectStatus?: string;

  // Album Design Module Fields
  albumDesignPdfUrl?: string;
  albumDesignStatus?: 'Not Uploaded' | 'Waiting for Client Review' | 'Client Reviewing' | 'Changes Requested' | 'Album Approved' | 'Approved';
  albumDesignUploadDate?: string;
  albumDesignNotes?: string;

  albumDesignPdfUrl2?: string;
  albumDesignStatus2?: 'Not Uploaded' | 'Waiting for Client Review' | 'Client Reviewing' | 'Changes Requested' | 'Album Approved' | 'Approved';
  albumDesignUploadDate2?: string;
  albumDesignNotes2?: string;

  // New manual Agreement Form fields
  contactPersonName?: string;
  fullAddress?: string;
  altContactNumber?: string;
  
  preWedding?: 'Yes' | 'No';
  preWeddingDate?: string;
  preWeddingLocation?: string;
  preWeddingTime?: string;
  receptionDate?: string;
  receptionLocation?: string;
  receptionTime?: string;

  mehendiIncluded?: 'Yes' | 'No';
  mehendiDate?: string;
  mehendiTime?: string;
  mehendiLocation?: string;

  haldiIncluded?: 'Yes' | 'No';
  haldiDate?: string;
  haldiTime?: string;
  haldiLocation?: string;

  boubhatIncluded?: 'Yes' | 'No';
  boubhatDate?: string;
  boubhatTime?: string;
  boubhatLocation?: string;

  aiburobhatIncluded?: 'Yes' | 'No';
  aiburobhatDate?: string;
  aiburobhatTime?: string;
  aiburobhatLocation?: string;

  bidayIncluded?: 'Yes' | 'No';
  bidayDate?: string;
  bidayTime?: string;
  bidayLocation?: string;

  payment1?: number;
  payment2?: number;

  // Package Includes Photography
  pkgAlbum?: 'Yes' | 'No';
  pkgAlbumSize?: string;
  pkgAlbumQty?: number;
  pkgFrame?: 'Yes' | 'No';
  pkgFrameSize?: string;
  pkgFrameQty?: number;
  pkgPendriveSize?: string;
  pkgPendriveQty?: number;
  pkgEditedPhotosCount?: number;

  // Package Includes Videography
  pkgStandardVideoEditing?: 'Yes' | 'No';
  pkgCinematicVideoEditing?: 'Yes' | 'No';
  pkgRawVideo?: 'Yes' | 'No';
  pkgShortTrailer?: 'Yes' | 'No';
  pkgDroneCoverage?: 'Yes' | 'No';
  pkgLedWall?: 'Yes' | 'No';
  pkgCrane?: 'Yes' | 'No';
  pkgLiveStreaming?: 'Yes' | 'No';
}

export interface FreelancerAssignment {
  freelancerName: string;
  eventType: 'Aiburo Bhat' | 'Mehendi' | 'Wedding' | 'Bidaay Boron' | 'Reception';
  eventDate: string;
  venue: string;
  perDayRate: number;
  workingDays: number;
  totalPayment: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  clientName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Credit Card' | 'PayPal' | 'Other';
  status: 'completed' | 'pending';
  notes: string;
  createdAt: number;
  updatedAt?: number;
  userId?: string;
}

export type CollectionName = 'bookings' | 'payments' | 'settings';

export interface PendingOperation {
  id: string;
  collection: CollectionName;
  type: 'create' | 'update' | 'delete';
  data: any; // complete object for create/update, or id string/object for delete
  timestamp: number;
}

export interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  isSyncing?: boolean;
  syncVersion?: number;
}
