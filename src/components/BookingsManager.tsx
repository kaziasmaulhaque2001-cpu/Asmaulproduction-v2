import React, { useState, useEffect } from 'react';
import { Booking, FreelancerAssignment } from '../types';
import { offlineService } from '../services/offlineService';
import { getStatusChipColor, getStatusLabel } from '../utils/statusUtils';
import { useSyncState } from '../hooks/useSyncState';
import { useBrand } from '../contexts/BrandContext';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  FormControl,
  Select,
  InputLabel,
  OutlinedInput,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Mail,
  Phone,
  DollarSign,
  User,
  ChevronRight,
  FileText,
  MessageSquare,
  Check,
  RefreshCw,
  Send,
  History,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Users,
  Download,
  Copy,
  QrCode,
  ExternalLink,
  Share2,
  Eye,
  CalendarClock,
  CreditCard,
  CheckSquare,
  FileSignature
} from 'lucide-react';
import { 
  buildBookingConfirmationPDF,
  buildInvoicePDF,
  buildFreelancerWorkOrderPDF,
  buildAgreementPDF,
  downloadBookingConfirmationPDF, 
  downloadInvoicePDF, 
  downloadFreelancerWorkOrderPDF,
  downloadAgreementPDF,
  handlePDFActions,
  formatDateToDDMMYYYY
} from '../utils/pdfGenerator';
import { PDFActionsTriggerDialog } from './PDFActionsTriggerDialog';
import { PDFPreviewDialog } from './PDFPreviewDialog';
import { ProductionBookForm } from './ProductionBookForm';

interface BookingsManagerProps {
  initialTab?: 'production' | 'freelancer';
  bookingFormOpen: boolean;
  bookingFormType: 'production' | 'freelancer' | null;
  selectedBooking: Booking | null;
  onCloseBookingForm: () => void;
  onTriggerRefresh: () => void;
  refreshTrigger: number;
}

export const BookingsManager: React.FC<BookingsManagerProps> = ({
  initialTab = 'production',
  bookingFormOpen,
  bookingFormType,
  selectedBooking,
  onCloseBookingForm,
  onTriggerRefresh,
  refreshTrigger
}) => {
  const syncState = useSyncState();
  const { formatCurrency, settings } = useBrand();
  const [activeTab, setActiveTab] = useState<'production' | 'freelancer'>(initialTab);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Advanced Filter States for Freelancer module
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [freelancerFilter, setFreelancerFilter] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  
  // Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // PDF Action Dialog states
  const [pdfActionOpen, setPdfActionOpen] = useState(false);
  const [pdfActionData, setPdfActionData] = useState<{
    title: string;
    subtitle: string;
    clientName: string;
    documentType: 'Booking Confirmation' | 'Payment Receipt' | 'Invoice' | 'Agreement';
    booking: Booking;
  } | null>(null);

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [pdfPreviewFilename, setPdfPreviewFilename] = useState('');
  const [pdfPreviewDoc, setPdfPreviewDoc] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);

  // QR Dialog States
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [qrCodeLink, setQrCodeLink] = useState('');

  // WhatsApp status update states
  const [lastUpdatedStage, setLastUpdatedStage] = useState<{
    bookingId: string;
    label: string;
    value: string;
  } | null>(null);

  const handleSendWhatsAppUpdate = () => {
    if (!currentBooking || !lastUpdatedStage) return;
    const studioName = settings.studioName || "Vows Gold Photography";
    const clientName = currentBooking.clientName || "Client";
    const updatedStatus = `${lastUpdatedStage.label}: ${lastUpdatedStage.value}`;
    const dashboardLink = `${window.location.origin}/client/${currentBooking.id}`;
    
    // Clean phone number: remove non-digits
    const rawPhone = currentBooking.clientPhone || currentBooking.freelancerPhone || "";
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    const message = `Hello ${clientName},\n\nYour booking progress has been updated!\n\n*Studio Name:* ${studioName}\n*Client Name:* ${clientName}\n*Updated Status:* ${updatedStatus}\n*Track Progress:* ${dashboardLink}\n\nThank you for choosing ${studioName}!`;
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Status Dropdown rendering helper for live tracking
  const renderStatusDropdown = (label: string, field: keyof Booking, options: string[]) => {
    if (!currentBooking) return null;
    const val = (currentBooking[field] as string) || 'Pending';
    return (
      <Box className="flex flex-col gap-1">
        <Typography variant="caption" className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{label}</Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={val}
            onChange={async (e) => {
              const newVal = e.target.value;
              const updated = { ...currentBooking, [field]: newVal };
              setCurrentBooking(updated);
              await offlineService.updateBooking(updated);
              setLastUpdatedStage({
                bookingId: currentBooking.id,
                label,
                value: newVal
              });
              if (onTriggerRefresh) onTriggerRefresh();
            }}
            className="text-xs text-white bg-black/40 border border-[#D4AF37]/20 rounded h-8"
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiSelect-select': { py: 0.5, px: 1, display: 'flex', alignItems: 'center' }
            }}
          >
            {options.map(opt => (
              <MenuItem key={opt} value={opt} className="text-xs text-gray-300 bg-[#141413] hover:bg-[#D4AF37]/10">{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  // Form Fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState('');
  const [packageName, setPackageName] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [status, setStatus] = useState<Booking['status']>('pending');
  const [photographer, setPhotographer] = useState('');
  const [leadCinematographer, setLeadCinematographer] = useState('');
  const [notes, setNotes] = useState('');
  const [freelancerRate, setFreelancerRate] = useState<number | ''>('');
  const [assignedFreelancers, setAssignedFreelancers] = useState<string[]>([]);
  const [freelancerAssignments, setFreelancerAssignments] = useState<FreelancerAssignment[]>([]);

  // Automatic sync of weddingDate and venue to existing assignments
  useEffect(() => {
    setFreelancerAssignments(prev => prev.map(row => ({
      ...row,
      eventDate: weddingDate,
      venue: venue || 'Studio Production'
    })));
  }, [weddingDate, venue]);

  const handleAddAssignmentRow = () => {
    const newRow: FreelancerAssignment = {
      freelancerName: settings.photographers?.[0] || '',
      eventType: 'Wedding',
      eventDate: weddingDate || '',
      venue: venue || 'Studio Production',
      perDayRate: 0,
      workingDays: 1,
      totalPayment: 0
    };
    setFreelancerAssignments(prev => [...prev, newRow]);
  };

  const handleRemoveAssignmentRow = (index: number) => {
    setFreelancerAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAssignmentRow = (index: number, field: keyof FreelancerAssignment, value: any) => {
    setFreelancerAssignments(prev => prev.map((row, i) => {
      if (i === index) {
        const updatedRow = { ...row, [field]: value };
        if (field === 'perDayRate' || field === 'workingDays') {
          updatedRow.totalPayment = Number(updatedRow.perDayRate || 0) * Number(updatedRow.workingDays || 0);
        }
        return updatedRow;
      }
      return row;
    }));
  };
  
  // Custom Metadata Form Fields
  const [freelancerPhone, setFreelancerPhone] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [eventTime, setEventTime] = useState('12:00 PM');
  const [reportingTime, setReportingTime] = useState('11:00 AM');
  const [bookingFor, setBookingFor] = useState('Wedding');
  const [coverage, setCoverage] = useState('Both Side');

  // New manual Agreement Form fields
  const [contactPersonName, setContactPersonName] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [altContactNumber, setAltContactNumber] = useState('');
  
  const [preWedding, setPreWedding] = useState<'Yes' | 'No'>('No');
  const [preWeddingDate, setPreWeddingDate] = useState('');
  const [preWeddingLocation, setPreWeddingLocation] = useState('');
  const [preWeddingTime, setPreWeddingTime] = useState('12:00 PM');
  const [receptionDate, setReceptionDate] = useState('');
  const [receptionLocation, setReceptionLocation] = useState('');
  const [receptionTime, setReceptionTime] = useState('06:00 PM');

  const [mehendiIncluded, setMehendiIncluded] = useState<'Yes' | 'No'>('No');
  const [mehendiDate, setMehendiDate] = useState('');
  const [mehendiTime, setMehendiTime] = useState('04:00 PM');
  const [mehendiLocation, setMehendiLocation] = useState('');

  const [haldiIncluded, setHaldiIncluded] = useState<'Yes' | 'No'>('No');
  const [haldiDate, setHaldiDate] = useState('');
  const [haldiTime, setHaldiTime] = useState('09:00 AM');
  const [haldiLocation, setHaldiLocation] = useState('');

  const [boubhatIncluded, setBoubhatIncluded] = useState<'Yes' | 'No'>('No');
  const [boubhatDate, setBoubhatDate] = useState('');
  const [boubhatTime, setBoubhatTime] = useState('01:00 PM');
  const [boubhatLocation, setBoubhatLocation] = useState('');

  const [aiburobhatIncluded, setAiburobhatIncluded] = useState<'Yes' | 'No'>('No');
  const [aiburobhatDate, setAiburobhatDate] = useState('');
  const [aiburobhatTime, setAiburobhatTime] = useState('01:00 PM');
  const [aiburobhatLocation, setAiburobhatLocation] = useState('');

  const [bidayIncluded, setBidayIncluded] = useState<'Yes' | 'No'>('No');
  const [bidayDate, setBidayDate] = useState('');
  const [bidayTime, setBidayTime] = useState('04:00 PM');
  const [bidayLocation, setBidayLocation] = useState('');

  const [payment1, setPayment1] = useState<number | ''>('');
  const [payment2, setPayment2] = useState<number | ''>('');

  // Package Includes Photography
  const [pkgAlbum, setPkgAlbum] = useState<'Yes' | 'No'>('No');
  const [pkgAlbumSize, setPkgAlbumSize] = useState('');
  const [pkgAlbumQty, setPkgAlbumQty] = useState<number | ''>('');
  const [pkgFrame, setPkgFrame] = useState<'Yes' | 'No'>('No');
  const [pkgFrameSize, setPkgFrameSize] = useState('');
  const [pkgFrameQty, setPkgFrameQty] = useState<number | ''>('');
  const [pkgPendriveSize, setPkgPendriveSize] = useState('');
  const [pkgPendriveQty, setPkgPendriveQty] = useState<number | ''>('');
  const [pkgEditedPhotosCount, setPkgEditedPhotosCount] = useState<number | ''>('');

  // Package Includes Videography
  const [pkgStandardVideoEditing, setPkgStandardVideoEditing] = useState<'Yes' | 'No'>('No');
  const [pkgCinematicVideoEditing, setPkgCinematicVideoEditing] = useState<'Yes' | 'No'>('No');
  const [pkgRawVideo, setPkgRawVideo] = useState<'Yes' | 'No'>('No');
  const [pkgShortTrailer, setPkgShortTrailer] = useState<'Yes' | 'No'>('No');
  const [pkgDroneCoverage, setPkgDroneCoverage] = useState<'Yes' | 'No'>('No');
  const [pkgLedWall, setPkgLedWall] = useState<'Yes' | 'No'>('No');
  const [pkgCrane, setPkgCrane] = useState<'Yes' | 'No'>('No');
  const [pkgLiveStreaming, setPkgLiveStreaming] = useState<'Yes' | 'No'>('No');

  // WhatsApp Notification Dialog States
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappTargetBooking, setWhatsappTargetBooking] = useState<Booking | null>(null);
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState('');
  const [whatsappBrideName, setWhatsappBrideName] = useState('');
  const [whatsappGroomName, setWhatsappGroomName] = useState('');
  const [whatsappEventTime, setWhatsappEventTime] = useState('12:00 PM');
  const [whatsappReportingTime, setWhatsappReportingTime] = useState('11:00 AM');
  const [whatsappCustomMessage, setWhatsappCustomMessage] = useState('');
  const [whatsappDispatchStep, setWhatsappDispatchStep] = useState<'idle' | 'sending' | 'confirming'>('idle');

  // Template Generator helper
  const generateWhatsAppMessage = (params: {
    freelancerName: string;
    weddingDate: string;
    eventTime: string;
    clientName: string;
    brideName: string;
    groomName: string;
    venue: string;
    reportingTime: string;
    payoutAmount: number;
    notes: string;
    studioPhone: string;
    type?: 'production' | 'freelancer';
  }) => {
    if (params.type === 'freelancer') {
      return `Hello ${params.freelancerName},

You have been booked for a wedding shoot.

📅 Date: ${params.weddingDate}
💰 Payment: ₹${params.payoutAmount}

Please confirm your availability.

Thank you.`;
    }

    return `Hello ${params.freelancerName}! 👋

This is ${settings.studioName} with details for your upcoming assignment.

📅 Event Date: ${params.weddingDate}
⏰ Event Time: ${params.eventTime}
📍 Location: ${params.venue}
👥 Client: ${params.clientName}
👰 Bride: ${params.brideName || 'N/A'}
🤵 Groom: ${params.groomName || 'N/A'}
⏱️ Reporting Time: ${params.reportingTime}
💰 Payment payout: ${formatCurrency(params.payoutAmount)}

📝 Directives & Notes:
${params.notes || 'No custom instructions.'}

📞 If you have any questions, please reach back at ${params.studioPhone}.

Looking forward to working with you!`;
  };

  // Live preview update in the WhatsApp dialog
  useEffect(() => {
    if (whatsappTargetBooking && whatsappDialogOpen) {
      const generated = generateWhatsAppMessage({
        freelancerName: whatsappTargetBooking.photographer,
        weddingDate: whatsappTargetBooking.weddingDate,
        eventTime: whatsappEventTime,
        clientName: whatsappTargetBooking.clientName,
        brideName: whatsappBrideName,
        groomName: whatsappGroomName,
        venue: whatsappTargetBooking.venue,
        reportingTime: whatsappReportingTime,
        payoutAmount: whatsappTargetBooking.totalAmount || whatsappTargetBooking.freelancerRate || 0,
        notes: whatsappTargetBooking.notes,
        studioPhone: settings.studioPhone,
        type: whatsappTargetBooking.type
      });
      setWhatsappCustomMessage(generated);
    }
  }, [whatsappBrideName, whatsappGroomName, whatsappEventTime, whatsappReportingTime, whatsappTargetBooking, whatsappDialogOpen]);

  const handleTriggerWhatsAppDialog = (booking: Booking) => {
    setWhatsappTargetBooking(booking);
    setWhatsappRecipientPhone(booking.freelancerPhone || '');
    setWhatsappBrideName(booking.brideName || '');
    setWhatsappGroomName(booking.groomName || '');
    setWhatsappEventTime(booking.eventTime || '12:00 PM');
    setWhatsappReportingTime(booking.reportingTime || '11:00 AM');
    setWhatsappDispatchStep('idle');
    
    const initialMsg = generateWhatsAppMessage({
      freelancerName: booking.photographer,
      weddingDate: booking.weddingDate,
      eventTime: booking.eventTime || '12:00 PM',
      clientName: booking.clientName,
      brideName: booking.brideName || '',
      groomName: booking.groomName || '',
      venue: booking.venue,
      reportingTime: booking.reportingTime || '11:00 AM',
      payoutAmount: booking.totalAmount || booking.freelancerRate || 0,
      notes: booking.notes,
      studioPhone: settings.studioPhone,
      type: booking.type
    });
    setWhatsappCustomMessage(initialMsg);
    setWhatsappDialogOpen(true);
  };

  useEffect(() => {
    const loadBookings = async () => {
      const bData = await offlineService.getBookings();
      setBookings(bData);
    };
    loadBookings();
  }, [refreshTrigger, syncState.syncVersion]);

  // Sync external dialog triggers
  useEffect(() => {
    if (bookingFormOpen && bookingFormType) {
      handleOpenCreateForm(bookingFormType);
    }
  }, [bookingFormOpen, bookingFormType, selectedBooking]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'production' | 'freelancer') => {
    setActiveTab(newValue);
    setStatusFilter('all');
  };

  const resetForm = () => {
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setWeddingDate('');
    setVenue('');
    setPackageName('');
    setTotalAmount('');
    setPaidAmount('');
    setStatus('pending');
    setPhotographer('');
    setLeadCinematographer('');
    setNotes('');
    setFreelancerRate('');
    setFreelancerPhone('');
    setBrideName('');
    setGroomName('');
    setEventTime('12:00 PM');
    setReportingTime('11:00 AM');
    setBookingFor('Wedding');
    setCoverage('Both Side');
    setAssignedFreelancers([]);
    setFreelancerAssignments([]);

    // Reset manual agreement fields
    setContactPersonName('');
    setFullAddress('');
    setAltContactNumber('');
    setPreWedding('No');
    setPreWeddingDate('');
    setPreWeddingLocation('');
    setPreWeddingTime('12:00 PM');
    setReceptionDate('');
    setReceptionLocation('');
    setReceptionTime('06:00 PM');

    setMehendiIncluded('No');
    setMehendiDate('');
    setMehendiTime('04:00 PM');
    setMehendiLocation('');

    setHaldiIncluded('No');
    setHaldiDate('');
    setHaldiTime('09:00 AM');
    setHaldiLocation('');

    setBoubhatIncluded('No');
    setBoubhatDate('');
    setBoubhatTime('01:00 PM');
    setBoubhatLocation('');

    setAiburobhatIncluded('No');
    setAiburobhatDate('');
    setAiburobhatTime('01:00 PM');
    setAiburobhatLocation('');

    setBidayIncluded('No');
    setBidayDate('');
    setBidayTime('04:00 PM');
    setBidayLocation('');
    setPayment1('');
    setPayment2('');

    setPkgAlbum('No');
    setPkgAlbumSize('');
    setPkgAlbumQty('');
    setPkgFrame('No');
    setPkgFrameSize('');
    setPkgFrameQty('');
    setPkgPendriveSize('');
    setPkgPendriveQty('');
    setPkgEditedPhotosCount('');

    setPkgStandardVideoEditing('No');
    setPkgCinematicVideoEditing('No');
    setPkgRawVideo('No');
    setPkgShortTrailer('No');
    setPkgDroneCoverage('No');
    setPkgLedWall('No');
    setPkgCrane('No');
    setPkgLiveStreaming('No');

    setIsEditMode(false);
    setCurrentBooking(null);
  };

  const handleOpenCreateForm = (type: 'production' | 'freelancer') => {
    resetForm();
    setActiveTab(type);
    
    // Set smart defaults from dynamic branding settings
    if (settings.packages.length > 0) {
      setPackageName(settings.packages[0]);
    }
    
    if (type === 'production') {
      setPhotographer(settings.photographers[0] || '');
      setLeadCinematographer(settings.cinematographers && settings.cinematographers[0] || '');
    } else {
      setPhotographer('');
      setLeadCinematographer('');
    }
    setIsEditMode(false);
    setFormOpen(true);
  };

  const handleOpenEditForm = (booking: Booking) => {
    setIsEditMode(true);
    setCurrentBooking(booking);
    setClientName(booking.clientName);
    setClientEmail(booking.clientEmail);
    setClientPhone(booking.clientPhone);
    setWeddingDate(booking.weddingDate);
    setVenue(booking.venue);
    setPackageName(booking.packageName);
    setTotalAmount(booking.totalAmount);
    setPaidAmount(booking.paidAmount !== undefined ? booking.paidAmount : '');
    setStatus(booking.status);
    setPhotographer(booking.photographer);
    setLeadCinematographer(booking.leadCinematographer || '');
    setNotes(booking.notes);
    if (booking.type === 'freelancer' && booking.freelancerRate !== undefined) {
      setFreelancerRate(booking.freelancerRate);
    } else {
      setFreelancerRate('');
    }
    setFreelancerPhone(booking.freelancerPhone || '');
    setBrideName(booking.brideName || '');
    setGroomName(booking.groomName || '');
    setEventTime(booking.eventTime || '12:00 PM');
    setReportingTime(booking.reportingTime || '11:00 AM');
    setBookingFor(booking.bookingFor || 'Wedding');
    setCoverage(booking.coverage || 'Both Side');
    setAssignedFreelancers(booking.assignedFreelancers || []);
    setFreelancerAssignments(booking.freelancerAssignments || []);

    // Set new manual agreement fields
    setContactPersonName(booking.contactPersonName || '');
    setFullAddress(booking.fullAddress || '');
    setAltContactNumber(booking.altContactNumber || '');
    setPreWedding(booking.preWedding || 'No');
    setPreWeddingDate(booking.preWeddingDate || '');
    setPreWeddingLocation(booking.preWeddingLocation || '');
    setPreWeddingTime(booking.preWeddingTime || '12:00 PM');
    setReceptionDate(booking.receptionDate || '');
    setReceptionLocation(booking.receptionLocation || '');
    setReceptionTime(booking.receptionTime || '06:00 PM');

    setMehendiIncluded(booking.mehendiIncluded || 'No');
    setMehendiDate(booking.mehendiDate || '');
    setMehendiTime(booking.mehendiTime || '04:00 PM');
    setMehendiLocation(booking.mehendiLocation || '');

    setHaldiIncluded(booking.haldiIncluded || 'No');
    setHaldiDate(booking.haldiDate || '');
    setHaldiTime(booking.haldiTime || '09:00 AM');
    setHaldiLocation(booking.haldiLocation || '');

    setBoubhatIncluded(booking.boubhatIncluded || 'No');
    setBoubhatDate(booking.boubhatDate || '');
    setBoubhatTime(booking.boubhatTime || '01:00 PM');
    setBoubhatLocation(booking.boubhatLocation || '');

    setAiburobhatIncluded(booking.aiburobhatIncluded || 'No');
    setAiburobhatDate(booking.aiburobhatDate || '');
    setAiburobhatTime(booking.aiburobhatTime || '01:00 PM');
    setAiburobhatLocation(booking.aiburobhatLocation || '');

    setBidayIncluded(booking.bidayIncluded || 'No');
    setBidayDate(booking.bidayDate || '');
    setBidayTime(booking.bidayTime || '04:00 PM');
    setBidayLocation(booking.bidayLocation || '');
    setPayment1(booking.payment1 !== undefined ? booking.payment1 : '');
    setPayment2(booking.payment2 !== undefined ? booking.payment2 : '');

    setPkgAlbum(booking.pkgAlbum || 'No');
    setPkgAlbumSize(booking.pkgAlbumSize || '');
    setPkgAlbumQty(booking.pkgAlbumQty !== undefined ? booking.pkgAlbumQty : '');
    setPkgFrame(booking.pkgFrame || 'No');
    setPkgFrameSize(booking.pkgFrameSize || '');
    setPkgFrameQty(booking.pkgFrameQty !== undefined ? booking.pkgFrameQty : '');
    setPkgPendriveSize(booking.pkgPendriveSize || '');
    setPkgPendriveQty(booking.pkgPendriveQty !== undefined ? booking.pkgPendriveQty : '');
    setPkgEditedPhotosCount(booking.pkgEditedPhotosCount !== undefined ? booking.pkgEditedPhotosCount : '');

    setPkgStandardVideoEditing(booking.pkgStandardVideoEditing || 'No');
    setPkgCinematicVideoEditing(booking.pkgCinematicVideoEditing || 'No');
    setPkgRawVideo(booking.pkgRawVideo || 'No');
    setPkgShortTrailer(booking.pkgShortTrailer || 'No');
    setPkgDroneCoverage(booking.pkgDroneCoverage || 'No');
    setPkgLedWall(booking.pkgLedWall || 'No');
    setPkgCrane(booking.pkgCrane || 'No');
    setPkgLiveStreaming(booking.pkgLiveStreaming || 'No');

    setFormOpen(true);
  };

  const handleOpenDetails = (booking: Booking) => {
    setCurrentBooking(booking);
    setLastUpdatedStage(null);
    setDetailOpen(true);
  };

  const handleOpenDeleteConfirm = (id: string) => {
    setBookingToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    onCloseBookingForm();
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let bookingData: Booking;
    const finalAssignedFreelancers = Array.from(new Set([
      ...assignedFreelancers,
      ...freelancerAssignments.map(fa => fa.freelancerName)
    ])).filter(Boolean);
    
    if (activeTab === 'freelancer') {
      if (!photographer.trim() || !weddingDate || totalAmount === '') return;
      
      bookingData = {
        id: isEditMode && currentBooking ? currentBooking.id : `b_${Date.now()}`,
        clientName: photographer.trim(), // Maps Freelancer Name to clientName to satisfy database requirements and render in lists
        clientEmail: '',
        clientPhone: '',
        weddingDate,
        venue: 'Studio Production',
        packageName: 'Freelancer Outsource',
        totalAmount: Number(totalAmount),
        paidAmount: 0,
        status: 'confirmed',
        type: 'freelancer',
        photographer: photographer.trim(),
        notes: '',
        createdAt: isEditMode && currentBooking ? currentBooking.createdAt : Date.now(),
        freelancerRate: Number(totalAmount),
        freelancerPhone: '',
        brideName: '',
        groomName: '',
        eventTime: '12:00 PM',
        reportingTime: '11:00 AM',
        whatsappStatus: isEditMode && currentBooking ? currentBooking.whatsappStatus || 'none' : 'none',
        whatsappHistory: isEditMode && currentBooking ? currentBooking.whatsappHistory || [] : [],
        assignedFreelancers: finalAssignedFreelancers,
        freelancerAssignments
      };
    } else {
      if (!clientName.trim() || !weddingDate || !venue.trim() || !packageName.trim() || totalAmount === '') return;
      
      bookingData = {
        id: isEditMode && currentBooking ? currentBooking.id : `b_${Date.now()}`,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        weddingDate,
        venue: venue.trim(),
        packageName: packageName.trim(),
        totalAmount: Number(totalAmount),
        paidAmount: paidAmount !== '' ? Number(paidAmount) : 0,
        status,
        type: 'production',
        photographer: photographer.trim() || 'Alexander Sterling (Lead)',
        leadCinematographer: leadCinematographer.trim() || 'Marcus Thorne',
        notes: notes.trim(),
        createdAt: isEditMode && currentBooking ? currentBooking.createdAt : Date.now(),
        assignedFreelancers: finalAssignedFreelancers,
        freelancerAssignments,
        bookingFor,
        coverage,
        brideName: brideName.trim(),
        groomName: groomName.trim(),
        eventTime,
        reportingTime,
        
        // Manual Agreement Fields
        contactPersonName: contactPersonName.trim(),
        fullAddress: fullAddress.trim(),
        altContactNumber: altContactNumber.trim(),
        preWedding,
        preWeddingDate,
        preWeddingLocation: preWeddingLocation.trim(),
        preWeddingTime,
        receptionDate,
        receptionLocation: receptionLocation.trim(),
        receptionTime,

        mehendiIncluded,
        mehendiDate,
        mehendiTime,
        mehendiLocation: mehendiLocation.trim(),

        haldiIncluded,
        haldiDate,
        haldiTime,
        haldiLocation: haldiLocation.trim(),

        boubhatIncluded,
        boubhatDate,
        boubhatTime,
        boubhatLocation: boubhatLocation.trim(),

        aiburobhatIncluded,
        aiburobhatDate,
        aiburobhatTime,
        aiburobhatLocation: aiburobhatLocation.trim(),

        bidayIncluded,
        bidayDate,
        bidayTime,
        bidayLocation: bidayLocation.trim(),
        payment1: payment1 !== '' ? Number(payment1) : undefined,
        payment2: payment2 !== '' ? Number(payment2) : undefined,

        // Package Photography Options
        pkgAlbum,
        pkgAlbumSize: pkgAlbumSize.trim(),
        pkgAlbumQty: pkgAlbumQty !== '' ? Number(pkgAlbumQty) : undefined,
        pkgFrame,
        pkgFrameSize: pkgFrameSize.trim(),
        pkgFrameQty: pkgFrameQty !== '' ? Number(pkgFrameQty) : undefined,
        pkgPendriveSize: pkgPendriveSize.trim(),
        pkgPendriveQty: pkgPendriveQty !== '' ? Number(pkgPendriveQty) : undefined,
        pkgEditedPhotosCount: pkgEditedPhotosCount !== '' ? Number(pkgEditedPhotosCount) : undefined,

        // Package Videography Options
        pkgStandardVideoEditing,
        pkgCinematicVideoEditing,
        pkgRawVideo,
        pkgShortTrailer,
        pkgDroneCoverage,
        pkgLedWall,
        pkgCrane,
        pkgLiveStreaming
      };
    }

    try {
      if (isEditMode) {
        await offlineService.updateBooking(bookingData);
      } else {
        await offlineService.addBooking(bookingData);
      }
      onTriggerRefresh();
      handleCloseForm();

      // Automatically pop up the luxury PDF Actions Dialog for successfully saved client bookings
      if (bookingData.type === 'production') {
        setTimeout(() => {
          setPdfActionData({
            title: isEditMode ? 'Booking Updated Successfully!' : 'Booking Created Successfully!',
            subtitle: isEditMode 
              ? 'We have updated and compiled your Booking Confirmation.' 
              : 'We have registered your shoot and prepared the Booking Confirmation.',
            clientName: bookingData.clientName,
            documentType: 'Booking Confirmation',
            booking: bookingData
          });
          setPdfActionOpen(true);
        }, 300);
      }

      // Automatically launch WhatsApp verification dialog for NEW freelancer bookings
      if (!isEditMode && activeTab === 'freelancer') {
        setTimeout(() => {
          handleTriggerWhatsAppDialog(bookingData);
        }, 500);
      }
    } catch (err) {
      console.error('Error saving booking:', err);
    }
  };

  const handleTriggerPdfAction = async (action: 'preview' | 'download' | 'share' | 'whatsapp') => {
    if (!pdfActionData) return;
    const { booking, documentType } = pdfActionData;
    
    let doc;
    let filename = '';
    let messageText = '';
    
    if (documentType === 'Booking Confirmation') {
      doc = await buildBookingConfirmationPDF(booking, settings);
      filename = `booking_confirmation_${booking.id.slice(0, 8)}.pdf`;

      let bookingPayments: any[] = [];
      try {
        const allPayments = await offlineService.getPayments();
        bookingPayments = allPayments
          .filter((p) => p.bookingId === booking.id && p.status === 'completed')
          .sort((a, b) => a.date.localeCompare(b.date));
      } catch (err) {
        console.error('Error fetching payments for WhatsApp message:', err);
      }

      const firstPaymentAmount = bookingPayments.length > 0 ? bookingPayments[0].amount : booking.paidAmount;
      const totalPaidAmount = booking.paidAmount;
      const remainingDueAmount = Math.max(0, booking.totalAmount - totalPaidAmount);

      messageText = `📸 *Asmaul Production*

Hello *${booking.clientName}*,

Thank you for your payment.

💍 Event: ${booking.bookingFor || 'Wedding'}
📅 Event Date: ${formatDateToDDMMYYYY(booking.weddingDate)}

💰 Total Amount: ₹${booking.totalAmount.toLocaleString('en-IN')}
✅ Advance Paid: ₹${firstPaymentAmount.toLocaleString('en-IN')}
💳 Total Paid: ₹${totalPaidAmount.toLocaleString('en-IN')}
📌 Remaining Due: ₹${remainingDueAmount.toLocaleString('en-IN')}

Please find your booking confirmation/payment receipt attached.

Thank you for choosing Asmaul Production.`;
    } else if (documentType === 'Invoice') {
      // Invoice
      doc = await buildInvoicePDF(booking, settings);
      filename = `invoice_${booking.id.slice(0, 8)}.pdf`;
      messageText = `📸 *Asmaul Production*

Hello *${booking.clientName}*,

Your booking Invoice is ready.

*Booking ID:*
${booking.id.toUpperCase().slice(0, 8)}

*Total Package Value:*
₹${booking.totalAmount.toLocaleString('en-IN')}

*Advance Received:*
₹${booking.paidAmount.toLocaleString('en-IN')}

*Net Outstanding:*
₹${(booking.totalAmount - booking.paidAmount).toLocaleString('en-IN')}

Thank you for choosing Asmaul Production.`;
    } else {
      // Agreement
      doc = await buildAgreementPDF(booking, settings);
      filename = `agreement_document_${booking.id.slice(0, 8).toUpperCase()}.pdf`;
      messageText = `📸 *${settings.studioName || 'Asmaul Production'}*

Hello *${booking.clientName}*,

Please find the *Wedding Photography & Cinematography Agreement* for your booking on *${formatDateToDDMMYYYY(booking.weddingDate)}* attached.

*Agreement No:* AGR-${booking.id.slice(0, 8).toUpperCase()}
*Selected Package:* ${booking.packageName}
*Total Package Value:* ₹${booking.totalAmount.toLocaleString('en-IN')}
*Outstanding Due:* ₹${(booking.totalAmount - booking.paidAmount).toLocaleString('en-IN')}

Kindly review and print the terms and conditions in the document.

Thank you for choosing ${settings.studioName || 'Asmaul Production'}.`;
    }

    if (action === 'preview') {
      const url = doc.output('bloburl');
      setPdfPreviewUrl(url);
      setPdfPreviewTitle(`${documentType} Preview`);
      setPdfPreviewFilename(filename);
      setPdfPreviewDoc(doc);
      setPdfPreviewOpen(true);
    } else {
      await handlePDFActions(doc, filename, action, messageText, booking.clientPhone || '', (url) => {
        setPdfPreviewUrl(url);
        setPdfPreviewTitle(`${documentType} Preview`);
        setPdfPreviewFilename(filename);
        setPdfPreviewDoc(doc);
        setPdfPreviewOpen(true);
      });
    }
  };

  const handleMarkAsSent = async () => {
    if (!whatsappTargetBooking) return;
    
    const updatedHistory = whatsappTargetBooking.whatsappHistory ? [...whatsappTargetBooking.whatsappHistory] : [];
    updatedHistory.push({
      id: `w_${Date.now()}`,
      timestamp: Date.now(),
      status: 'sent',
      message: whatsappCustomMessage,
      recipientPhone: whatsappRecipientPhone
    });
    
    const updatedBooking: Booking = {
      ...whatsappTargetBooking,
      whatsappStatus: 'sent',
      whatsappHistory: updatedHistory,
      freelancerPhone: whatsappRecipientPhone,
      brideName: whatsappBrideName,
      groomName: whatsappGroomName,
      eventTime: whatsappEventTime,
      reportingTime: whatsappReportingTime
    };
    
    try {
      await offlineService.updateBooking(updatedBooking);
      setWhatsappDialogOpen(false);
      onTriggerRefresh();
      
      // Update details dialog state if open
      if (detailOpen && currentBooking && currentBooking.id === whatsappTargetBooking.id) {
        setCurrentBooking(updatedBooking);
      }
    } catch (err) {
      console.error('Error recording WhatsApp log:', err);
    }
  };

  const handleMarkAsFailed = async () => {
    if (!whatsappTargetBooking) return;
    
    const updatedHistory = whatsappTargetBooking.whatsappHistory ? [...whatsappTargetBooking.whatsappHistory] : [];
    updatedHistory.push({
      id: `w_${Date.now()}`,
      timestamp: Date.now(),
      status: 'failed',
      message: whatsappCustomMessage,
      recipientPhone: whatsappRecipientPhone
    });
    
    const updatedBooking: Booking = {
      ...whatsappTargetBooking,
      whatsappStatus: 'failed',
      whatsappHistory: updatedHistory,
      freelancerPhone: whatsappRecipientPhone,
      brideName: whatsappBrideName,
      groomName: whatsappGroomName,
      eventTime: whatsappEventTime,
      reportingTime: whatsappReportingTime
    };
    
    try {
      await offlineService.updateBooking(updatedBooking);
      setWhatsappDispatchStep('idle');
      onTriggerRefresh();
      
      // Update details dialog state if open
      if (detailOpen && currentBooking && currentBooking.id === whatsappTargetBooking.id) {
        setCurrentBooking(updatedBooking);
      }
    } catch (err) {
      console.error('Error recording WhatsApp log:', err);
    }
  };

  const handleDispatchWhatsApp = () => {
    if (!whatsappRecipientPhone) return;
    
    setWhatsappDispatchStep('confirming');
    
    // Construct WhatsApp link
    const cleanPhone = whatsappRecipientPhone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(whatsappCustomMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async () => {
    if (!bookingToDelete) return;
    try {
      await offlineService.deleteBooking(bookingToDelete);
      onTriggerRefresh();
      setDeleteConfirmOpen(false);
      setBookingToDelete(null);
      if (detailOpen) setDetailOpen(false);
    } catch (err) {
      console.error('Error deleting booking:', err);
    }
  };

  // Unique list of freelancer names for filtering
  const uniqueFreelancers = Array.from(
    new Set(
      bookings
        .filter((b) => b.type === 'freelancer' && b.photographer)
        .map((b) => b.photographer.trim())
    )
  ).sort();

  // Helper to parse YYYY-MM-DD string to a local Date object (at noon to avoid timezone shift)
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  };

  // Filter and Search Bookings
  const filteredBookings = bookings.filter((b) => {
    if (b.type !== activeTab) return false;
    
    if (activeTab === 'freelancer') {
      // 1. By Freelancer Name (Search Input)
      if (searchQuery && !b.photographer.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 2. By Selected Freelancer Name (Dropdown Filter)
      if (freelancerFilter !== 'all' && b.photographer !== freelancerFilter) {
        return false;
      }

      // 3. Date Range Filter
      const bDateStr = b.weddingDate; // 'YYYY-MM-DD'
      if (!bDateStr) return false;

      const bDate = parseLocalDate(bDateStr);
      const today = new Date();
      
      // Helper to format Date to YYYY-MM-DD local format
      const formatYYYYMMDD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const todayStr = formatYYYYMMDD(today);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = formatYYYYMMDD(tomorrow);

      if (dateFilter === 'today') {
        if (bDateStr !== todayStr) return false;
      } else if (dateFilter === 'tomorrow') {
        if (bDateStr !== tomorrowStr) return false;
      } else if (dateFilter === 'week') {
        // Find start and end of current local week (Sunday to Saturday)
        const currentDay = today.getDay();
        const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        startOfWeek.setDate(today.getDate() - currentDay);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const bTime = bDate.getTime();
        if (bTime < startOfWeek.getTime() || bTime > endOfWeek.getTime()) {
          return false;
        }
      } else if (dateFilter === 'month') {
        // Start and end of current calendar month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        const bTime = bDate.getTime();
        if (bTime < startOfMonth.getTime() || bTime > endOfMonth.getTime()) {
          return false;
        }
      } else if (dateFilter === 'custom') {
        if (startDate && bDateStr < startDate) {
          return false;
        }
        if (endDate && bDateStr > endDate) {
          return false;
        }
      }

      return true;
    }
    
    const matchesSearch = 
      b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.photographer.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort Bookings by Event Date (ascending or descending) or Amount (Low to High / High to Low)
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (activeTab === 'freelancer') {
      if (sortField === 'amount') {
        const amountA = a.totalAmount || a.freelancerRate || 0;
        const amountB = b.totalAmount || b.freelancerRate || 0;
        return sortOrder === 'asc' ? amountA - amountB : amountB - amountA;
      } else {
        // Default Date sort
        const dateA = new Date(a.weddingDate).getTime() || 0;
        const dateB = new Date(b.weddingDate).getTime() || 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    }
    return new Date(b.weddingDate).getTime() - new Date(a.weddingDate).getTime(); // Default newest first for production
  });

  const filteredFreelancerBookings = filteredBookings.filter(b => b.type === 'freelancer');
  const filteredFreelancerCount = filteredFreelancerBookings.length;
  const filteredFreelancerAmount = filteredFreelancerBookings.reduce((sum, b) => sum + (b.totalAmount || b.freelancerRate || 0), 0);

  const totalFreelancerAmount = bookings
    .filter(b => b.type === 'freelancer')
    .reduce((sum, b) => sum + (b.totalAmount || b.freelancerRate || 0), 0);

  return (
    <Box className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Box>
          <Typography variant="h5" className="text-gold-gradient font-bold tracking-wider font-serif mb-0.5">
            BOOKING ARCHIVES
          </Typography>
          <Typography variant="caption" className="text-gray-500 uppercase tracking-widest text-[11px] block">
            Studio Production & Contractual Portfolios
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={() => handleOpenCreateForm(activeTab)}
          className="w-full sm:w-auto"
        >
          {activeTab === 'production' ? 'Add Production Book' : 'Add Freelancer Book'}
        </Button>
      </div>

      {/* Tabs Menu (Production vs Freelancer) */}
      <Box className="border-b border-[#D4AF37]/15">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          className="min-h-0"
        >
          <Tab
            label="Production Bookings"
            value="production"
            className="font-serif tracking-widest text-xs font-bold py-3.5"
          />
          <Tab
            label="Freelancer Contracts"
            value="freelancer"
            className="font-serif tracking-widest text-xs font-bold py-3.5"
          />
        </Tabs>
      </Box>

      {/* KPI Card for Freelancer contracts */}
      {activeTab === 'freelancer' && (
        <Card className="border border-[#D4AF37]/20 bg-gradient-to-r from-black/50 to-[#D4AF37]/5 shadow-lg shadow-[#D4AF37]/5">
          <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Box>
              <Typography variant="caption" className="text-[#D4AF37] uppercase tracking-widest text-[11px] block font-bold">
                Total Freelancer Outsource Volume
              </Typography>
              <Typography variant="h4" className="text-gold-gradient font-mono font-black mt-1">
                {formatCurrency(totalFreelancerAmount)}
              </Typography>
            </Box>
            <Box className="bg-[#D4AF37]/10 px-3 py-1.5 rounded border border-[#D4AF37]/20 text-right">
              <Typography variant="caption" className="text-gray-400 block text-[10px] uppercase font-bold">
                Active Contracts
              </Typography>
              <Typography variant="subtitle2" className="text-white font-mono font-bold">
                {bookings.filter(b => b.type === 'freelancer').length} Schedules logged
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-grow">
          <TextField
            fullWidth
            placeholder={activeTab === 'production' ? "Search clients, venues, photographers or packages..." : "Search by freelancer name..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-4 h-4 text-gray-500" />
                  </InputAdornment>
                ),
                className: "bg-black/20"
              }
            }}
            size="small"
          />
        </div>
        
        {activeTab === 'production' ? (
          <div className="w-full sm:w-1/3">
            <TextField
              select
              fullWidth
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Filter by Status"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Filter className="w-4 h-4 text-[#D4AF37]" />
                    </InputAdornment>
                  ),
                  className: "bg-black/20"
                }
              }}
            >
              <MenuItem value="all">All Booking States</MenuItem>
              <MenuItem value="pending">Awaiting (Pending)</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </div>
        ) : (
          <Button
            variant="outlined"
            size="medium"
            onClick={() => setShowFilters(prev => !prev)}
            className={`h-10 px-4 flex items-center justify-center gap-2 font-serif font-bold normal-case text-xs w-full sm:w-auto shrink-0 transition-all duration-200 ${
              showFilters || (dateFilter !== 'all' || freelancerFilter !== 'all' || sortField !== 'date')
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' 
                : 'border-[#D4AF37]/35 text-[#D4AF37]'
            }`}
            startIcon={<Filter className="w-4 h-4" />}
          >
            Filters
            {((dateFilter !== 'all' ? 1 : 0) + (freelancerFilter !== 'all' ? 1 : 0) + (sortField !== 'date' ? 1 : 0)) > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-[#D4AF37] text-black font-mono font-black rounded-full leading-none">
                {(dateFilter !== 'all' ? 1 : 0) + (freelancerFilter !== 'all' ? 1 : 0) + (sortField !== 'date' ? 1 : 0)}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Advanced Collapsible Filter Panel */}
      {activeTab === 'freelancer' && showFilters && (
        <Card className="border border-[#D4AF37]/20 bg-[#070707] p-5 rounded-lg space-y-4 shadow-lg shadow-[#D4AF37]/5 transition-all duration-300">
          <Typography variant="subtitle2" className="text-[#D4AF37] font-serif font-bold uppercase tracking-wider text-xs">
            Advanced Freelancer Filters
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Filter Selection */}
            <div className="space-y-2">
              <Typography variant="caption" className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                Filter by Date Range
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                slotProps={{ input: { className: "bg-black/45" } }}
              >
                <MenuItem value="all">Show All Bookings</MenuItem>
                <MenuItem value="today">Today's Bookings</MenuItem>
                <MenuItem value="tomorrow">Tomorrow's Bookings</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="custom">Custom Date Range</MenuItem>
              </TextField>
            </div>

            {/* Freelancer Name Selection */}
            <div className="space-y-2">
              <Typography variant="caption" className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                Filter by Freelancer Name
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={freelancerFilter}
                onChange={(e) => setFreelancerFilter(e.target.value)}
                slotProps={{ input: { className: "bg-black/45" } }}
              >
                <MenuItem value="all">Show All Freelancers</MenuItem>
                {uniqueFreelancers.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            </div>

            {/* Sort Order Selector */}
            <div className="space-y-2">
              <Typography variant="caption" className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">
                Sort List Order
              </Typography>
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  slotProps={{ input: { className: "bg-black/45" } }}
                >
                  <MenuItem value="date">Sort by Date</MenuItem>
                  <MenuItem value="amount">Sort by Amount</MenuItem>
                </TextField>
                
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  slotProps={{ input: { className: "bg-black/45" } }}
                >
                  {sortField === 'amount' ? [
                    <MenuItem key="asc" value="asc">Low to High</MenuItem>,
                    <MenuItem key="desc" value="desc">High to Low</MenuItem>
                  ] : [
                    <MenuItem key="asc" value="asc">Oldest First</MenuItem>,
                    <MenuItem key="desc" value="desc">Newest First</MenuItem>
                  ]}
                </TextField>
              </div>
            </div>
          </div>

          {/* Collapsible Custom Date Range Pickers */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#D4AF37]/10">
              <div className="space-y-1">
                <Typography variant="caption" className="text-gray-400 block font-bold text-[10px] uppercase">
                  Start Date
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </div>
              <div className="space-y-1">
                <Typography variant="caption" className="text-gray-400 block font-bold text-[10px] uppercase">
                  End Date
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </div>
            </div>
          )}

          {/* Quick Clear Button */}
          <div className="flex justify-end pt-2 border-t border-[#D4AF37]/10">
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setDateFilter('all');
                setStartDate('');
                setEndDate('');
                setFreelancerFilter('all');
                setSortField('date');
                setSortOrder('asc');
                setSearchQuery('');
              }}
              className="text-[#D4AF37] font-bold text-xs normal-case"
            >
              Reset All Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Dynamic Results Summary Banner */}
      {activeTab === 'freelancer' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-gradient-to-r from-black/60 to-[#D4AF37]/5 border border-[#D4AF37]/15 shadow-md">
          <div>
            <Typography variant="caption" className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block leading-none mb-1">
              Currently Displayed Contracts
            </Typography>
            <Typography variant="body1" className="text-white font-serif font-black">
              <span className="text-[#D4AF37] font-mono font-black text-lg">{filteredFreelancerCount}</span> {filteredFreelancerCount === 1 ? 'Schedule' : 'Schedules'} matched
            </Typography>
          </div>
          <div className="mt-3 sm:mt-0 text-left sm:text-right">
            <Typography variant="caption" className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block leading-none mb-1">
              Filtered Volume Payout
            </Typography>
            <Typography variant="h6" className="text-emerald-400 font-mono font-black">
              {formatCurrency(filteredFreelancerAmount)}
            </Typography>
          </div>
        </div>
      )}

      {/* Bookings Cards Grid */}
      {sortedBookings.length === 0 ? (
        <Box className="py-16 text-center border border-dashed border-[#D4AF37]/25 rounded-xl bg-black/10">
          <FileText className="w-12 h-12 text-[#AA7C11]/50 mx-auto mb-3" />
          <Typography variant="subtitle1" className="text-gray-400 font-serif font-semibold">
            No Records Uncovered
          </Typography>
          <Typography variant="caption" className="text-gray-500 block max-w-sm mx-auto mt-1">
            Try adjusting search terms, altering filters or log a fresh wedding booking.
          </Typography>
        </Box>
      ) : activeTab === 'freelancer' ? (
        /* Minimalist Freelancer Contract Cards List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBookings.map((b) => (
            <Card 
              key={b.id}
              className="hover:border-[#D4AF37]/45 border border-[#D4AF37]/15 bg-[#0a0a0a] transition-all group duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  {/* Freelancer Name Header */}
                  <div>
                    <Typography variant="caption" className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-0.5">
                      Freelancer Name
                    </Typography>
                    <Typography variant="h6" className="text-white font-serif font-bold group-hover:text-[#D4AF37] transition-colors text-base sm:text-lg truncate">
                      {b.photographer}
                    </Typography>
                  </div>

                  {/* Event Date Grid */}
                  <div className="flex items-center gap-2.5 text-xs text-gray-300">
                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    <div>
                      <Typography variant="caption" className="text-gray-500 uppercase tracking-wider text-[8px] font-bold block leading-none">
                        Event Date
                      </Typography>
                      <span className="font-mono font-bold mt-0.5 block">{formatDateToDDMMYYYY(b.weddingDate)}</span>
                    </div>
                  </div>

                  {/* Amount Grid */}
                  <div className="flex items-center gap-2.5 text-xs text-gray-300">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <div>
                      <Typography variant="caption" className="text-gray-500 uppercase tracking-wider text-[8px] font-bold block leading-none">
                        Amount
                      </Typography>
                      <span className="font-mono font-black text-emerald-400 text-sm mt-0.5 block">
                        ₹{(b.totalAmount || b.freelancerRate || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Row */}
                <Box className="flex justify-between items-center gap-2 pt-3.5 border-t border-gold-glow/5">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleTriggerWhatsAppDialog(b)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] normal-case px-3 py-1 flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Send WhatsApp
                  </Button>

                  <Box className="flex items-center gap-0.5">
                    <Tooltip title="Edit Booking Info">
                      <IconButton size="small" onClick={() => handleOpenEditForm(b)} className="text-[#D4AF37]/80 hover:text-[#D4AF37]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Archive">
                      <IconButton size="small" onClick={() => handleOpenDeleteConfirm(b.id)} className="text-red-400/80 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Standard Production Bookings Card List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedBookings.map((b) => {
            const outstanding = b.totalAmount - b.paidAmount;
            return (
              <Card 
                key={b.id}
                className="hover:border-[#D4AF37]/45 transition-all group duration-300 relative overflow-hidden h-full flex flex-col justify-between"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <Box className="space-y-3.5">
                    {/* Top Row: Client Name & Status */}
                    <Box className="flex justify-between items-start gap-2">
                      <Box>
                        <Typography variant="h6" className="text-white font-serif font-bold group-hover:text-gold-gradient transition-colors text-base sm:text-lg">
                          {b.clientName}
                        </Typography>
                        <Typography variant="caption" className="text-[#D4AF37] uppercase tracking-wider text-[10px] block font-medium">
                          {b.packageName}
                        </Typography>
                      </Box>
                      <Chip
                        label={getStatusLabel(b.status)}
                        variant="outlined"
                        size="small"
                        className={`text-[9px] font-bold uppercase tracking-widest h-5 px-1.5 ${getStatusChipColor(b.status)}`}
                      />
                    </Box>

                    {/* Detail list metadata */}
                    <Box className="space-y-1.5 text-xs text-gray-400">
                      <Box className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#AA7C11] flex-shrink-0" />
                        <span className="font-semibold">{formatDateToDDMMYYYY(b.weddingDate)}</span>
                      </Box>
                      <Box className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#AA7C11] flex-shrink-0" />
                        <span className="truncate">{b.venue}</span>
                      </Box>
                      <Box className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#AA7C11] flex-shrink-0" />
                        <span>{b.photographer}</span>
                      </Box>
                      {b.type === 'freelancer' && b.freelancerRate !== undefined && (
                        <Box className="flex items-center gap-2 mt-1 p-1 bg-black/20 rounded border border-[#D4AF37]/10 w-fit">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest px-1 font-bold">Freelancer Payout:</span>
                          <span className="font-mono font-bold text-[#D4AF37] text-[11px]">{formatCurrency(b.freelancerRate)}</span>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Divider and financial summary */}
                  <Box className="mt-4 pt-3.5 border-t border-[#D4AF37]/10 flex justify-between items-end">
                    <Box>
                      <Typography variant="caption" className="text-gray-500 uppercase text-[9px] tracking-wider block">
                        Total Gross Contract
                      </Typography>
                      <Typography variant="subtitle1" className="font-mono font-bold text-[#D4AF37] text-sm sm:text-base leading-none">
                        {formatCurrency(b.totalAmount)}
                      </Typography>
                    </Box>
                    <Box className="text-right">
                      <Typography variant="caption" className="text-gray-500 uppercase text-[9px] tracking-wider block">
                        Pending Balance
                      </Typography>
                      {outstanding > 0 ? (
                        <Typography variant="subtitle1" className="font-mono font-bold text-amber-400 text-sm sm:text-base leading-none">
                          {formatCurrency(outstanding)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" className="text-green-400 font-bold tracking-widest text-[10px] uppercase block">
                          PAID IN FULL
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Actions row */}
                  <Box className="flex justify-end gap-1 mt-4 pt-2 border-t border-dashed border-gold-glow/5">
                    <Tooltip title="View Contract Details">
                      <IconButton size="small" onClick={() => handleOpenDetails(b)} className="text-gray-400 hover:text-white">
                        <ChevronRight className="w-4 h-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Booking Info">
                      <IconButton size="small" onClick={() => handleOpenEditForm(b)} className="text-[#D4AF37]/80 hover:text-[#D4AF37]">
                        <Edit2 className="w-4 h-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Archive">
                      <IconButton size="small" onClick={() => handleOpenDeleteConfirm(b.id)} className="text-red-400/80 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* --- FORM DIALOG (CREATE/EDIT) --- */}
      <Dialog open={formOpen} onClose={handleCloseForm} fullWidth maxWidth={activeTab === 'production' ? 'md' : 'sm'}>
        <DialogTitle component="div" className="border-b border-[#D4AF37]/20 pb-3">
          <Typography variant="h5" className="text-gold-gradient font-bold font-serif">
            {isEditMode ? 'AMEND CONTRACT BOOK' : activeTab === 'production' ? 'NEW PRODUCTION BOOK' : 'NEW FREELANCER CONTRACT'}
          </Typography>
          <Typography variant="caption" className="text-gray-400 text-[11px]">
            {isEditMode ? 'Modify record parameters' : 'Seed details into IndexedDB registers'}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4 pt-4">
            {activeTab === 'freelancer' ? (
              <>
                {/* Freelancer Name */}
                <TextField
                  fullWidth
                  label="Freelancer Name"
                  placeholder="e.g. Elena Rostova"
                  value={photographer}
                  onChange={(e) => setPhotographer(e.target.value)}
                  required
                />

                {/* Event Date */}
                <TextField
                  fullWidth
                  label="Event Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  required
                />

                {/* Amount */}
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">{settings.currencySymbol}</InputAdornment>,
                    }
                  }}
                  required
                />

                {/* Assign Freelancers Option */}
                <FormControl fullWidth className="mt-2">
                  <InputLabel id="assigned-freelancers-freelancer-label">Assign Freelancers</InputLabel>
                  <Select
                    labelId="assigned-freelancers-freelancer-label"
                    id="assigned-freelancers-freelancer"
                    multiple
                    value={assignedFreelancers}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignedFreelancers(typeof val === 'string' ? val.split(',') : val);
                    }}
                    input={<OutlinedInput label="Assign Freelancers" />}
                    renderValue={(selected) => (
                      <Box className="flex flex-wrap gap-1">
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" className="bg-[#D4AF37]/20 text-[#D4AF37] text-[11px] font-medium" />
                        ))}
                      </Box>
                    )}
                  >
                    {!settings.photographers || settings.photographers.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>No photographers configured (Add in Brand Settings)</em>
                      </MenuItem>
                    ) : (
                      settings.photographers.map((name) => (
                        <MenuItem key={name} value={name}>
                          <Checkbox checked={assignedFreelancers.indexOf(name) > -1} size="small" className="text-[#D4AF37] p-1 mr-1" />
                          <ListItemText primary={name} slotProps={{ primary: { className: 'text-xs' } }} />
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                {/* Granular Freelancer Event Assignments */}
                <Box className="border border-[#D4AF37]/20 rounded-lg p-3 bg-black/20 space-y-3 mt-3">
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/10 pb-1.5">
                    <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Event-Specific Freelancer Assignments
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={handleAddAssignmentRow}
                      className="text-[9px] h-5 py-0 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold uppercase tracking-wider px-1.5"
                    >
                      + Add Event
                    </Button>
                  </div>

                  {freelancerAssignments.length === 0 ? (
                    <div className="text-gray-500 text-[10px] py-1 text-center italic">
                      No event-specific freelancer assignments added yet.
                    </div>
                  ) : (
                    <Box className="space-y-3">
                      {freelancerAssignments.map((assignment, index) => (
                        <Box key={index} className="p-2.5 bg-black/40 rounded border border-gray-900 space-y-2.5 relative">
                          <IconButton 
                            size="small" 
                            className="absolute top-1 right-1 text-red-400 hover:text-red-300 p-0.5"
                            onClick={() => handleRemoveAssignmentRow(index)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconButton>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {/* Freelancer Name Select */}
                            <FormControl fullWidth size="small">
                              <InputLabel id={`assignment-freelancer-label-f-${index}`} className="text-xs">Freelancer</InputLabel>
                              <Select
                                labelId={`assignment-freelancer-label-f-${index}`}
                                value={assignment.freelancerName}
                                label="Freelancer"
                                onChange={(e) => handleUpdateAssignmentRow(index, 'freelancerName', e.target.value)}
                                className="text-xs"
                              >
                                {!settings.photographers || settings.photographers.length === 0 ? (
                                  <MenuItem disabled value="">
                                    <em>No photographers configured</em>
                                  </MenuItem>
                                ) : (
                                  settings.photographers.map((name) => (
                                    <MenuItem key={name} value={name} className="text-xs">
                                      {name}
                                    </MenuItem>
                                  ))
                                )}
                              </Select>
                            </FormControl>

                            {/* Event Type Select */}
                            <FormControl fullWidth size="small">
                              <InputLabel id={`assignment-event-type-label-f-${index}`} className="text-xs">Event Type</InputLabel>
                              <Select
                                labelId={`assignment-event-type-label-f-${index}`}
                                value={assignment.eventType}
                                label="Event Type"
                                onChange={(e) => handleUpdateAssignmentRow(index, 'eventType', e.target.value)}
                                className="text-xs"
                              >
                                {['Aiburo Bhat', 'Mehendi', 'Wedding', 'Bidaay Boron', 'Reception'].map((type) => (
                                  <MenuItem key={type} value={type} className="text-xs">
                                    {type}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Event Date (Automatic) */}
                            <TextField
                              size="small"
                              label="Date"
                              disabled
                              value={weddingDate || 'No date set'}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />

                            {/* Venue (Automatic) */}
                            <TextField
                              size="small"
                              label="Venue"
                              disabled
                              value={venue || 'Studio Production'}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />

                            {/* Per Day Rate */}
                            <TextField
                              size="small"
                              type="number"
                              label={`Rate (${settings.currencySymbol})`}
                              value={assignment.perDayRate === 0 ? '' : assignment.perDayRate}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                handleUpdateAssignmentRow(index, 'perDayRate', val);
                              }}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />

                            {/* Working Days */}
                            <TextField
                              size="small"
                              type="number"
                              label="Days"
                              value={assignment.workingDays === 0 ? '' : assignment.workingDays}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                handleUpdateAssignmentRow(index, 'workingDays', val);
                              }}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />
                          </div>

                          <div className="flex justify-end text-[10px] text-[#D4AF37] font-semibold pr-1">
                            Total: {settings.currencySymbol}{assignment.perDayRate * assignment.workingDays}
                          </div>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <>
                <ProductionBookForm
                  clientName={clientName}
                  setClientName={setClientName}
                  clientEmail={clientEmail}
                  setClientEmail={setClientEmail}
                  clientPhone={clientPhone}
                  setClientPhone={setClientPhone}
                  weddingDate={weddingDate}
                  setWeddingDate={setWeddingDate}
                  venue={venue}
                  setVenue={setVenue}
                  packageName={packageName}
                  setPackageName={setPackageName}
                  totalAmount={totalAmount}
                  setTotalAmount={setTotalAmount}
                  paidAmount={paidAmount}
                  setPaidAmount={setPaidAmount}
                  status={status}
                  setStatus={setStatus}
                  photographer={photographer}
                  setPhotographer={setPhotographer}
                  leadCinematographer={leadCinematographer}
                  setLeadCinematographer={setLeadCinematographer}
                  notes={notes}
                  setNotes={setNotes}
                  contactPersonName={contactPersonName}
                  setContactPersonName={setContactPersonName}
                  altContactNumber={altContactNumber}
                  setAltContactNumber={setAltContactNumber}
                  fullAddress={fullAddress}
                  setFullAddress={setFullAddress}
                  preWedding={preWedding}
                  setPreWedding={setPreWedding}
                  preWeddingDate={preWeddingDate}
                  setPreWeddingDate={setPreWeddingDate}
                  preWeddingLocation={preWeddingLocation}
                  setPreWeddingLocation={setPreWeddingLocation}
                  preWeddingTime={preWeddingTime}
                  setPreWeddingTime={setPreWeddingTime}
                  receptionDate={receptionDate}
                  setReceptionDate={setReceptionDate}
                  receptionLocation={receptionLocation}
                  setReceptionLocation={setReceptionLocation}
                  receptionTime={receptionTime}
                  setReceptionTime={setReceptionTime}
                  mehendiIncluded={mehendiIncluded}
                  setMehendiIncluded={setMehendiIncluded}
                  mehendiDate={mehendiDate}
                  setMehendiDate={setMehendiDate}
                  mehendiTime={mehendiTime}
                  setMehendiTime={setMehendiTime}
                  mehendiLocation={mehendiLocation}
                  setMehendiLocation={setMehendiLocation}
                  haldiIncluded={haldiIncluded}
                  setHaldiIncluded={setHaldiIncluded}
                  haldiDate={haldiDate}
                  setHaldiDate={setHaldiDate}
                  haldiTime={haldiTime}
                  setHaldiTime={setHaldiTime}
                  haldiLocation={haldiLocation}
                  setHaldiLocation={setHaldiLocation}
                  boubhatIncluded={boubhatIncluded}
                  setBoubhatIncluded={setBoubhatIncluded}
                  boubhatDate={boubhatDate}
                  setBoubhatDate={setBoubhatDate}
                  boubhatTime={boubhatTime}
                  setBoubhatTime={setBoubhatTime}
                  boubhatLocation={boubhatLocation}
                  setBoubhatLocation={setBoubhatLocation}
                  aiburobhatIncluded={aiburobhatIncluded}
                  setAiburobhatIncluded={setAiburobhatIncluded}
                  aiburobhatDate={aiburobhatDate}
                  setAiburobhatDate={setAiburobhatDate}
                  aiburobhatTime={aiburobhatTime}
                  setAiburobhatTime={setAiburobhatTime}
                  aiburobhatLocation={aiburobhatLocation}
                  setAiburobhatLocation={setAiburobhatLocation}
                  bidayIncluded={bidayIncluded}
                  setBidayIncluded={setBidayIncluded}
                  bidayDate={bidayDate}
                  setBidayDate={setBidayDate}
                  bidayTime={bidayTime}
                  setBidayTime={setBidayTime}
                  bidayLocation={bidayLocation}
                  setBidayLocation={setBidayLocation}
                  payment1={payment1}
                  setPayment1={setPayment1}
                  payment2={payment2}
                  setPayment2={setPayment2}
                  pkgAlbum={pkgAlbum}
                  setPkgAlbum={setPkgAlbum}
                  pkgAlbumSize={pkgAlbumSize}
                  setPkgAlbumSize={setPkgAlbumSize}
                  pkgAlbumQty={pkgAlbumQty}
                  setPkgAlbumQty={setPkgAlbumQty}
                  pkgFrame={pkgFrame}
                  setPkgFrame={setPkgFrame}
                  pkgFrameSize={pkgFrameSize}
                  setPkgFrameSize={setPkgFrameSize}
                  pkgFrameQty={pkgFrameQty}
                  setPkgFrameQty={setPkgFrameQty}
                  pkgPendriveSize={pkgPendriveSize}
                  setPkgPendriveSize={setPkgPendriveSize}
                  pkgPendriveQty={pkgPendriveQty}
                  setPkgPendriveQty={setPkgPendriveQty}
                  pkgEditedPhotosCount={pkgEditedPhotosCount}
                  setPkgEditedPhotosCount={setPkgEditedPhotosCount}
                  pkgStandardVideoEditing={pkgStandardVideoEditing}
                  setPkgStandardVideoEditing={setPkgStandardVideoEditing}
                  pkgCinematicVideoEditing={pkgCinematicVideoEditing}
                  setPkgCinematicVideoEditing={setPkgCinematicVideoEditing}
                  pkgRawVideo={pkgRawVideo}
                  setPkgRawVideo={setPkgRawVideo}
                  pkgShortTrailer={pkgShortTrailer}
                  setPkgShortTrailer={setPkgShortTrailer}
                  pkgDroneCoverage={pkgDroneCoverage}
                  setPkgDroneCoverage={setPkgDroneCoverage}
                  pkgLedWall={pkgLedWall}
                  setPkgLedWall={setPkgLedWall}
                  pkgCrane={pkgCrane}
                  setPkgCrane={setPkgCrane}
                  pkgLiveStreaming={pkgLiveStreaming}
                  setPkgLiveStreaming={setPkgLiveStreaming}
                  assignedFreelancers={assignedFreelancers}
                  setAssignedFreelancers={setAssignedFreelancers}
                  freelancerAssignments={freelancerAssignments}
                  setFreelancerAssignments={setFreelancerAssignments}
                  handleAddAssignmentRow={handleAddAssignmentRow}
                  handleRemoveAssignmentRow={handleRemoveAssignmentRow}
                  handleUpdateAssignmentRow={handleUpdateAssignmentRow}
                  bookingFor={bookingFor}
                  setBookingFor={setBookingFor}
                  coverage={coverage}
                  setCoverage={setCoverage}
                  brideName={brideName}
                  setBrideName={setBrideName}
                  groomName={groomName}
                  setGroomName={setGroomName}
                  eventTime={eventTime}
                  setEventTime={setEventTime}
                  reportingTime={reportingTime}
                  setReportingTime={setReportingTime}
                  settings={settings}
                  isEditMode={isEditMode}
                />
                {false && (
                  <>
                    <TextField
                      fullWidth
                      label="Client Marriage Name"
                  placeholder="e.g. Eleanor & Charles"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    fullWidth
                    label="Client Email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Client Phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    fullWidth
                    label="Wedding Date"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    required
                  />
                  <TextField
                    select
                    fullWidth
                    label="Contract Package Name"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    required
                  >
                    {!settings.packages || settings.packages.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>No packages configured (Add in Brand Settings)</em>
                      </MenuItem>
                    ) : (
                      settings.packages.map((pkg) => (
                        <MenuItem key={pkg} value={pkg}>
                          {pkg}
                        </MenuItem>
                      ))
                    )}
                  </TextField>
                </div>

                <TextField
                  fullWidth
                  label="Wedding Venue & Location"
                  placeholder="e.g. Chateau Montelena, Calistoga"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    select
                    fullWidth
                    label="Booking For"
                    value={bookingFor}
                    onChange={(e) => setBookingFor(e.target.value)}
                    required
                  >
                    {['Wedding', 'Reception', 'Pre Wedding', 'Engagement', 'Other'].map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Coverage"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                    required
                  >
                    {['Bride Side', 'Groom Side', 'Both Side'].map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    fullWidth
                    label="Total Contract Amount"
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">{settings.currencySymbol}</InputAdornment>,
                      }
                    }}
                    required
                  />
                  <TextField
                    select
                    fullWidth
                    label="Booking Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Booking['status'])}
                  >
                    <MenuItem value="pending">Pending Engagement</MenuItem>
                    <MenuItem value="confirmed">Confirmed / Retained</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Production Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </TextField>
                </div>

                <TextField
                  select
                  fullWidth
                  label="Lead Photographer"
                  value={photographer}
                  onChange={(e) => setPhotographer(e.target.value)}
                  required
                >
                  {!settings.photographers || settings.photographers.length === 0 ? (
                    <MenuItem disabled value="">
                      <em>No photographers configured (Add in Brand Settings)</em>
                    </MenuItem>
                  ) : (
                    settings.photographers.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))
                  )}
                </TextField>

                {/* Assign Freelancers Option */}
                <FormControl fullWidth>
                  <InputLabel id="assigned-freelancers-production-label">Assign Freelancers</InputLabel>
                  <Select
                    labelId="assigned-freelancers-production-label"
                    id="assigned-freelancers-production"
                    multiple
                    value={assignedFreelancers}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignedFreelancers(typeof val === 'string' ? val.split(',') : val);
                    }}
                    input={<OutlinedInput label="Assign Freelancers" />}
                    renderValue={(selected) => (
                      <Box className="flex flex-wrap gap-1">
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" className="bg-[#D4AF37]/20 text-[#D4AF37] text-[11px] font-medium" />
                        ))}
                      </Box>
                    )}
                  >
                    {!settings.photographers || settings.photographers.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>No photographers configured (Add in Brand Settings)</em>
                      </MenuItem>
                    ) : (
                      settings.photographers.map((name) => (
                        <MenuItem key={name} value={name}>
                          <Checkbox checked={assignedFreelancers.indexOf(name) > -1} size="small" className="text-[#D4AF37] p-1 mr-1" />
                          <ListItemText primary={name} slotProps={{ primary: { className: 'text-xs' } }} />
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                {/* Granular Freelancer Event Assignments */}
                <Box className="border border-[#D4AF37]/20 rounded-lg p-3 bg-black/20 space-y-3 mt-3">
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/10 pb-1.5">
                    <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Event-Specific Freelancer Assignments
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={handleAddAssignmentRow}
                      className="text-[9px] h-5 py-0 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold uppercase tracking-wider px-1.5"
                    >
                      + Add Event
                    </Button>
                  </div>

                  {freelancerAssignments.length === 0 ? (
                    <div className="text-gray-500 text-[10px] py-1 text-center italic">
                      No event-specific freelancer assignments added yet.
                    </div>
                  ) : (
                    <Box className="space-y-3">
                      {freelancerAssignments.map((assignment, index) => (
                        <Box key={index} className="p-2.5 bg-black/40 rounded border border-gray-900 space-y-2.5 relative">
                          <IconButton 
                            size="small" 
                            className="absolute top-1 right-1 text-red-400 hover:text-red-300 p-0.5"
                            onClick={() => handleRemoveAssignmentRow(index)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconButton>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {/* Freelancer Name Select */}
                            <FormControl fullWidth size="small">
                              <InputLabel id={`assignment-freelancer-label-p-${index}`} className="text-xs">Freelancer</InputLabel>
                              <Select
                                labelId={`assignment-freelancer-label-p-${index}`}
                                value={assignment.freelancerName}
                                label="Freelancer"
                                onChange={(e) => handleUpdateAssignmentRow(index, 'freelancerName', e.target.value)}
                                className="text-xs"
                              >
                                {!settings.photographers || settings.photographers.length === 0 ? (
                                  <MenuItem disabled value="">
                                    <em>No photographers configured</em>
                                  </MenuItem>
                                ) : (
                                  settings.photographers.map((name) => (
                                    <MenuItem key={name} value={name} className="text-xs">
                                      {name}
                                    </MenuItem>
                                  ))
                                )}
                              </Select>
                            </FormControl>

                            {/* Event Type Select */}
                            <FormControl fullWidth size="small">
                              <InputLabel id={`assignment-event-type-label-p-${index}`} className="text-xs">Event Type</InputLabel>
                              <Select
                                 labelId={`assignment-event-type-label-p-${index}`}
                                 value={assignment.eventType}
                                 label="Event Type"
                                 onChange={(e) => handleUpdateAssignmentRow(index, 'eventType', e.target.value)}
                                 className="text-xs"
                              >
                                {['Aiburo Bhat', 'Mehendi', 'Wedding', 'Bidaay Boron', 'Reception'].map((type) => (
                                  <MenuItem key={type} value={type} className="text-xs">
                                    {type}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Event Date (Automatic) */}
                            <TextField
                              size="small"
                              label="Date"
                              disabled
                              value={weddingDate || 'No date set'}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />

                            {/* Venue (Automatic) */}
                            <TextField
                              size="small"
                              label="Venue"
                              disabled
                              value={venue || 'Studio Production'}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />

                            {/* Per Day Rate */}
                            <TextField
                              size="small"
                              type="number"
                              label={`Rate (${settings.currencySymbol})`}
                              value={assignment.perDayRate === 0 ? '' : assignment.perDayRate}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                handleUpdateAssignmentRow(index, 'perDayRate', val);
                              }}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />

                            {/* Working Days */}
                            <TextField
                              size="small"
                              type="number"
                              label="Days"
                              value={assignment.workingDays === 0 ? '' : assignment.workingDays}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                handleUpdateAssignmentRow(index, 'workingDays', val);
                              }}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />
                          </div>

                          <div className="flex justify-end text-[10px] text-[#D4AF37] font-semibold pr-1">
                            Total: {settings.currencySymbol}{assignment.perDayRate * assignment.workingDays}
                          </div>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                {/* ─── EXTRA CLIENT DETAILS ─── */}
                <Box className="border-t border-[#D4AF37]/10 pt-4 mt-2 space-y-4">
                  <Typography variant="subtitle2" className="text-[#D4AF37] uppercase tracking-wider font-bold text-xs">
                    Client Details (Agreement Additions)
                  </Typography>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      fullWidth
                      label="Bride Name"
                      placeholder="e.g. Eleanor Vance"
                      value={brideName}
                      onChange={(e) => setBrideName(e.target.value)}
                    />
                    <TextField
                      fullWidth
                      label="Groom Name"
                      placeholder="e.g. Charles Sterling"
                      value={groomName}
                      onChange={(e) => setGroomName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      fullWidth
                      label="Contact Person Name"
                      placeholder="Name of primary contact"
                      value={contactPersonName}
                      onChange={(e) => setContactPersonName(e.target.value)}
                    />
                    <TextField
                      fullWidth
                      label="Alternate Contact Number"
                      placeholder="e.g. +91 98765 43210"
                      value={altContactNumber}
                      onChange={(e) => setAltContactNumber(e.target.value)}
                    />
                  </div>

                  <TextField
                    fullWidth
                    label="Full Address"
                    placeholder="Billing/Shipping Address"
                    multiline
                    rows={2}
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                  />
                </Box>

                {/* ─── WORK INFORMATION ─── */}
                <Box className="border-t border-[#D4AF37]/10 pt-4 space-y-4">
                  <Typography variant="subtitle2" className="text-[#D4AF37] uppercase tracking-wider font-bold text-xs">
                    Work Information & Schedule
                  </Typography>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormControl fullWidth>
                      <InputLabel id="pre-wedding-label">Pre Wedding Included?</InputLabel>
                      <Select
                        labelId="pre-wedding-label"
                        value={preWedding}
                        label="Pre Wedding Included?"
                        onChange={(e) => setPreWedding(e.target.value as 'Yes' | 'No')}
                      >
                        <MenuItem value="No">No</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Pre Wedding Date"
                      type="date"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={preWeddingDate}
                      onChange={(e) => setPreWeddingDate(e.target.value)}
                      disabled={preWedding === 'No'}
                    />

                    <TextField
                      fullWidth
                      label="Pre Wedding Location"
                      placeholder="e.g. Victoria Memorial"
                      value={preWeddingLocation}
                      onChange={(e) => setPreWeddingLocation(e.target.value)}
                      disabled={preWedding === 'No'}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      fullWidth
                      label="Reception Date"
                      type="date"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={receptionDate}
                      onChange={(e) => setReceptionDate(e.target.value)}
                    />
                    <TextField
                      fullWidth
                      label="Reception Location"
                      placeholder="e.g. JW Marriott Ballroom"
                      value={receptionLocation}
                      onChange={(e) => setReceptionLocation(e.target.value)}
                    />
                  </div>
                </Box>

                {/* ─── PAYMENT SCHEDULE ─── */}
                <Box className="border-t border-[#D4AF37]/10 pt-4 space-y-4">
                  <Typography variant="subtitle2" className="text-[#D4AF37] uppercase tracking-wider font-bold text-xs">
                    Payment Schedule (Installments)
                  </Typography>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <TextField
                      fullWidth
                      label={`Advance Paid (${settings.currencySymbol})`}
                      type="number"
                      placeholder="Advance/Retainer paid amount"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                    />
                    <TextField
                      fullWidth
                      label={`1st Payment (${settings.currencySymbol})`}
                      type="number"
                      placeholder="Scheduled first installment"
                      value={payment1}
                      onChange={(e) => setPayment1(e.target.value !== '' ? Number(e.target.value) : '')}
                    />
                    <TextField
                      fullWidth
                      label={`2nd Payment (${settings.currencySymbol})`}
                      type="number"
                      placeholder="Scheduled second installment"
                      value={payment2}
                      onChange={(e) => setPayment2(e.target.value !== '' ? Number(e.target.value) : '')}
                    />
                  </div>
                </Box>

                {/* ─── PACKAGE INCLUDES ─── */}
                <Box className="border-t border-[#D4AF37]/10 pt-4 space-y-4">
                  <Typography variant="subtitle2" className="text-[#D4AF37] uppercase tracking-wider font-bold text-xs">
                    Package Deliverables & Inclusions
                  </Typography>

                  {/* Photography Deliverables */}
                  <Box className="p-3 bg-black/20 rounded border border-[#D4AF37]/10 space-y-3">
                    <Typography variant="caption" className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block">
                      📸 Photography Deliverables
                    </Typography>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-album-label">Album Included?</InputLabel>
                        <Select
                          labelId="pkg-album-label"
                          value={pkgAlbum}
                          label="Album Included?"
                          onChange={(e) => setPkgAlbum(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        fullWidth
                        label="Album Size"
                        placeholder="e.g. 12x15, 12x18"
                        value={pkgAlbumSize}
                        onChange={(e) => setPkgAlbumSize(e.target.value)}
                        disabled={pkgAlbum === 'No'}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        label="Album Quantity"
                        type="number"
                        placeholder="e.g. 1"
                        value={pkgAlbumQty}
                        onChange={(e) => setPkgAlbumQty(e.target.value !== '' ? Number(e.target.value) : '')}
                        disabled={pkgAlbum === 'No'}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-frame-label">Photo Frame?</InputLabel>
                        <Select
                          labelId="pkg-frame-label"
                          value={pkgFrame}
                          label="Photo Frame?"
                          onChange={(e) => setPkgFrame(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        fullWidth
                        label="Frame Size"
                        placeholder="e.g. 20x24"
                        value={pkgFrameSize}
                        onChange={(e) => setPkgFrameSize(e.target.value)}
                        disabled={pkgFrame === 'No'}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        label="Frame Quantity"
                        type="number"
                        placeholder="e.g. 2"
                        value={pkgFrameQty}
                        onChange={(e) => setPkgFrameQty(e.target.value !== '' ? Number(e.target.value) : '')}
                        disabled={pkgFrame === 'No'}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <TextField
                        size="small"
                        fullWidth
                        label="Pendrive Size"
                        placeholder="e.g. 64GB, 128GB"
                        value={pkgPendriveSize}
                        onChange={(e) => setPkgPendriveSize(e.target.value)}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        label="Pendrive Qty"
                        type="number"
                        placeholder="e.g. 1"
                        value={pkgPendriveQty}
                        onChange={(e) => setPkgPendriveQty(e.target.value !== '' ? Number(e.target.value) : '')}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        label="Edited Photos Count"
                        type="number"
                        placeholder="e.g. 250"
                        value={pkgEditedPhotosCount}
                        onChange={(e) => setPkgEditedPhotosCount(e.target.value !== '' ? Number(e.target.value) : '')}
                      />
                    </div>
                  </Box>

                  {/* Videography Deliverables */}
                  <Box className="p-3 bg-black/20 rounded border border-[#D4AF37]/10">
                    <Typography variant="caption" className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block mb-3">
                      🎥 Videography Deliverables & Coverage
                    </Typography>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-std-video-label">Std Video</InputLabel>
                        <Select
                          labelId="pkg-std-video-label"
                          value={pkgStandardVideoEditing}
                          label="Std Video"
                          onChange={(e) => setPkgStandardVideoEditing(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-cine-video-label">Cine Video</InputLabel>
                        <Select
                          labelId="pkg-cine-video-label"
                          value={pkgCinematicVideoEditing}
                          label="Cine Video"
                          onChange={(e) => setPkgCinematicVideoEditing(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-raw-video-label">Raw Video</InputLabel>
                        <Select
                          labelId="pkg-raw-video-label"
                          value={pkgRawVideo}
                          label="Raw Video"
                          onChange={(e) => setPkgRawVideo(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-trailer-label">Short Trailer</InputLabel>
                        <Select
                          labelId="pkg-trailer-label"
                          value={pkgShortTrailer}
                          label="Short Trailer"
                          onChange={(e) => setPkgShortTrailer(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-drone-label">Drone Cover</InputLabel>
                        <Select
                          labelId="pkg-drone-label"
                          value={pkgDroneCoverage}
                          label="Drone Cover"
                          onChange={(e) => setPkgDroneCoverage(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-led-label">LED Wall</InputLabel>
                        <Select
                          labelId="pkg-led-label"
                          value={pkgLedWall}
                          label="LED Wall"
                          onChange={(e) => setPkgLedWall(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-crane-label">Crane</InputLabel>
                        <Select
                          labelId="pkg-crane-label"
                          value={pkgCrane}
                          label="Crane"
                          onChange={(e) => setPkgCrane(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel id="pkg-live-label">Live Stream</InputLabel>
                        <Select
                          labelId="pkg-live-label"
                          value={pkgLiveStreaming}
                          label="Live Stream"
                          onChange={(e) => setPkgLiveStreaming(e.target.value as 'Yes' | 'No')}
                        >
                          <MenuItem value="No">No</MenuItem>
                          <MenuItem value="Yes">Yes</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  label="Executive Log Notes"
                  placeholder="Rehearsal dinner coverage, custom album requests, framing, lens configs..."
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                  </>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions className="border-t border-[#D4AF37]/15 p-4 justify-between">
            <Typography variant="caption" className="text-gray-500">
              {!syncState.isOnline && '⚠️ Saving offline to IndexedDB'}
            </Typography>
            <Box className="flex gap-2">
              <Button onClick={handleCloseForm} color="inherit" size="small">
                Cancel
              </Button>
              <Button type="submit" variant="contained" size="small">
                {isEditMode ? 'Update Record' : 'Record Booking'}
              </Button>
            </Box>
          </DialogActions>
        </form>
      </Dialog>

      {/* --- DETAILS DIALOG --- */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        {currentBooking && (
          <>
            {currentBooking.type === 'freelancer' ? (
              /* Minimalist Freelancer Details View */
              <>
                <DialogTitle component="div" className="border-b border-[#D4AF37]/20 flex justify-between items-start">
                  <Box>
                    <Typography variant="h5" className="text-gold-gradient font-bold font-serif leading-tight">
                      {currentBooking.photographer}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500 uppercase tracking-widest text-[9px] block mt-0.5">
                      Freelancer Contract
                    </Typography>
                  </Box>
                  <FormControl size="small" variant="outlined" className="min-w-[120px]">
                    <Select
                      value={currentBooking.status || 'pending'}
                      onChange={async (e) => {
                        const newStatus = e.target.value as Booking['status'];
                        const updatedBooking = { ...currentBooking, status: newStatus };
                        setCurrentBooking(updatedBooking);
                        await offlineService.updateBooking(updatedBooking);
                        setLastUpdatedStage({
                          bookingId: currentBooking.id,
                          label: "Overall Booking Status",
                          value: getStatusLabel(newStatus)
                        });
                        if (onTriggerRefresh) onTriggerRefresh();
                      }}
                      className={`text-[10px] font-bold uppercase tracking-wider h-7 ${getStatusChipColor(currentBooking.status || 'pending')}`}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { py: 0.5, px: 1.5, display: 'flex', alignItems: 'center' },
                        color: 'inherit'
                      }}
                    >
                      <MenuItem value="pending" className="text-xs uppercase font-bold text-gray-400">Pending</MenuItem>
                      <MenuItem value="confirmed" className="text-xs uppercase font-bold text-yellow-400">Confirmed</MenuItem>
                      <MenuItem value="in_progress" className="text-xs uppercase font-bold text-blue-400">In Progress</MenuItem>
                      <MenuItem value="completed" className="text-xs uppercase font-bold text-green-400">Completed</MenuItem>
                      <MenuItem value="cancelled" className="text-xs uppercase font-bold text-red-400">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </DialogTitle>
                <DialogContent className="pt-4 space-y-4">
                  <Box className="bg-black/25 p-4 rounded border border-[#D4AF37]/10 flex justify-between items-center">
                    <Box>
                      <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block leading-none">Contract Amount</Typography>
                      <Typography variant="h5" className="text-emerald-400 font-mono font-bold mt-1 leading-none">
                        ₹{(currentBooking.totalAmount || 0).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>

                  <List className="p-0 space-y-2">
                    <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                      <ListItemIcon className="min-w-8"><Calendar className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                      <ListItemText 
                        primary={<span className="text-gray-400 text-xs block">Event Date</span>} 
                        secondary={<span className="text-white font-mono font-bold text-sm block mt-0.5">{formatDateToDDMMYYYY(currentBooking.weddingDate)}</span>} 
                      />
                    </ListItem>
                    <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                      <ListItemIcon className="min-w-8"><User className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                      <ListItemText 
                        primary={<span className="text-gray-400 text-xs block">Freelancer Name</span>} 
                        secondary={<span className="text-white text-sm block mt-0.5">{currentBooking.photographer}</span>} 
                      />
                    </ListItem>
                    {currentBooking.assignedFreelancers && currentBooking.assignedFreelancers.length > 0 && (
                      <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                        <ListItemIcon className="min-w-8"><Users className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-400 text-xs block">Assigned Freelancers</span>
                          <Box className="flex flex-wrap gap-1 mt-1.5">
                            {currentBooking.assignedFreelancers.map((val) => (
                              <Chip key={val} label={val} size="small" className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] border border-[#D4AF37]/30" />
                            ))}
                          </Box>
                        </div>
                      </ListItem>
                    )}
                  </List>

                  {/* Event-Specific Freelancer Assignments List in Detail dialog */}
                  {currentBooking.freelancerAssignments && currentBooking.freelancerAssignments.length > 0 && (
                    <Box className="space-y-2 pt-3 border-t border-[#D4AF37]/15">
                      <Typography variant="caption" className="text-[#D4AF37] uppercase tracking-widest font-bold text-[10px] block mb-1">
                        Freelancer Event Assignments
                      </Typography>
                      <Box className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {currentBooking.freelancerAssignments.map((assignment, idx) => {
                          const freelancerPhoneLookup = bookings.find(b => b.type === 'freelancer' && b.photographer === assignment.freelancerName)?.freelancerPhone || currentBooking.freelancerPhone || '';
                          
                          const handleSendAssignmentWhatsApp = () => {
                            const message = `Event Type: ${assignment.eventType}
Event Date: ${formatDateToDDMMYYYY(assignment.eventDate)}
Venue: ${assignment.venue}
Per Day Rate: ${settings.currencySymbol}${assignment.perDayRate}
Working Days: ${assignment.workingDays}
Total Payment: ${settings.currencySymbol}${assignment.totalPayment}`;
                            
                            const cleanPhone = freelancerPhoneLookup.replace(/\D/g, '') || '';
                            const encodedText = encodeURIComponent(message);
                            const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          };

                          return (
                            <Box key={idx} className="p-3 bg-black/45 rounded border border-[#D4AF37]/10 space-y-1.5">
                              <div className="flex justify-between items-center">
                                <Typography variant="body2" className="text-[#D4AF37] font-bold text-xs">
                                  {assignment.freelancerName} — {assignment.eventType}
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={handleSendAssignmentWhatsApp}
                                  className="text-[9px] h-5 py-0 bg-green-950/40 border border-green-800/40 text-green-400 font-bold uppercase hover:bg-green-900/30 px-2"
                                >
                                  WhatsApp
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-400">
                                <div>📅 <span className="text-gray-500">Date:</span> {formatDateToDDMMYYYY(assignment.eventDate)}</div>
                                <div>📍 <span className="text-gray-500">Venue:</span> {assignment.venue}</div>
                                <div>💰 <span className="text-gray-500">Rate:</span> {settings.currencySymbol}{assignment.perDayRate}/day</div>
                                <div>⏱️ <span className="text-gray-500">Days:</span> {assignment.workingDays} days</div>
                              </div>
                              <div className="text-right text-[10px] text-emerald-400 font-bold pt-1 border-t border-gray-900/40 font-mono">
                                Total: {settings.currencySymbol}{assignment.totalPayment}
                              </div>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {/* WhatsApp Notification Dispatch block */}
                  <Box className="mt-4 pt-4 border-t border-[#D4AF37]/20">
                    <Typography variant="caption" className="text-gray-500 uppercase tracking-widest font-bold text-[10px] block mb-2">
                      WhatsApp Outsource Dispatch
                    </Typography>
                    
                    {/* Current WhatsApp Status */}
                    <Box className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-black/40 rounded border border-[#D4AF37]/10 gap-3 mb-3">
                      <Box className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse ${
                          currentBooking.whatsappStatus === 'sent' ? 'bg-green-500' :
                          currentBooking.whatsappStatus === 'failed' ? 'bg-red-500' : 'bg-gray-600'
                        }`} />
                        <Box>
                          <Typography variant="body2" className="text-white font-medium text-xs leading-none">
                            {currentBooking.whatsappStatus === 'sent' ? 'Status: DISPATCHED' :
                             currentBooking.whatsappStatus === 'failed' ? 'Status: DISPATCH FAILED' : 'Status: UNNOTIFIED'}
                          </Typography>
                          <Typography variant="caption" className="text-gray-400 text-[10px] block mt-1">
                            {currentBooking.freelancerPhone ? `Freelancer Phone: ${currentBooking.freelancerPhone}` : 'No phone specified'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleTriggerWhatsAppDialog(currentBooking)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold normal-case text-xs px-3 py-1 flex items-center gap-1.5 self-end sm:self-center"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {currentBooking.whatsappStatus === 'sent' ? 'Send Again' : currentBooking.whatsappStatus === 'failed' ? 'Retry Dispatch' : 'Dispatch Info'}
                      </Button>
                    </Box>
                    
                    {/* Dispatch History log */}
                    {currentBooking.whatsappHistory && currentBooking.whatsappHistory.length > 0 ? (
                      <Box className="space-y-2 mt-2">
                        <Typography variant="caption" className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider block">
                          Communication History Log
                        </Typography>
                        <Box className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {currentBooking.whatsappHistory.slice().reverse().map((h, idx) => (
                            <Box key={h.id || idx} className="p-2.5 bg-black/20 rounded border border-[#D4AF37]/5 text-[11px] flex justify-between items-start gap-2">
                              <Box className="flex-grow">
                                <div className="text-gray-400 font-mono text-[9px] flex items-center gap-1.5">
                                  <History className="w-3 h-3 text-gray-500" />
                                  {formatDateToDDMMYYYY(h.timestamp)} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-gray-300 mt-1.5 whitespace-pre-wrap leading-relaxed border-l-2 border-[#D4AF37]/30 pl-2 font-mono text-[10px] line-clamp-3">
                                  {h.message}
                                </div>
                              </Box>
                              <Chip
                                label={h.status === 'sent' ? 'dispatched' : 'failed'}
                                size="small"
                                className={`text-[8px] uppercase font-bold h-4 flex-shrink-0 ${
                                  h.status === 'sent' ? 'bg-green-950/80 text-green-400 border border-green-800/30' : 'bg-red-950/80 text-red-400 border border-red-800/30'
                                }`}
                              />
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      <Box className="flex items-center gap-1.5 text-gray-500 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <Typography variant="caption" className="italic text-[11px]">
                          No dispatch operations have been recorded yet.
                        </Typography>
                      </Box>
                    )}

                    {lastUpdatedStage && lastUpdatedStage.bookingId === currentBooking.id && (
                      <Box className="p-3 bg-green-950/20 border border-green-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                        <Box className="space-y-0.5">
                          <Typography variant="caption" className="text-green-400 font-bold uppercase tracking-wider text-[10px] block">
                            Status Updated!
                          </Typography>
                          <Typography variant="body2" className="text-gray-300 text-xs">
                            Updated {lastUpdatedStage.label} to "{lastUpdatedStage.value}". Send notification on WhatsApp?
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleSendWhatsAppUpdate}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                          startIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          Send WhatsApp
                        </Button>
                      </Box>
                    )}
                  </Box>
                </DialogContent>
                <DialogActions className="border-t border-[#D4AF37]/15 p-3 flex justify-between items-center w-full">
                  <Box className="flex gap-2">
                    <Button 
                      onClick={() => downloadFreelancerWorkOrderPDF(currentBooking, settings)} 
                      variant="contained" 
                      color="secondary" 
                      size="small"
                      startIcon={<Download className="w-4 h-4" />}
                      className="bg-amber-950/40 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-amber-900/30 text-xs py-1"
                    >
                      Work Order PDF
                    </Button>
                  </Box>
                  <Box className="flex gap-2">
                    <Button onClick={() => handleOpenEditForm(currentBooking)} variant="outlined" size="small" className="border-[#D4AF37]/50 text-[#D4AF37]">
                      Edit Contract
                    </Button>
                    <Button onClick={() => setDetailOpen(false)} color="inherit" size="small">
                      Close
                    </Button>
                  </Box>
                </DialogActions>
              </>
            ) : (
              /* Standard Production Details View */
              <>
                <DialogTitle component="div" className="border-b border-[#D4AF37]/20 flex justify-between items-start">
                  <Box>
                    <Typography variant="h5" className="text-gold-gradient font-bold font-serif leading-tight">
                      {currentBooking.clientName}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500 uppercase tracking-widest text-[9px] block">
                      {currentBooking.packageName} • Production
                    </Typography>
                  </Box>
                  <FormControl size="small" variant="outlined" className="min-w-[120px]">
                    <Select
                      value={currentBooking.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as Booking['status'];
                        const updatedBooking = { ...currentBooking, status: newStatus };
                        setCurrentBooking(updatedBooking);
                        await offlineService.updateBooking(updatedBooking);
                        setLastUpdatedStage({
                          bookingId: currentBooking.id,
                          label: "Overall Booking Status",
                          value: getStatusLabel(newStatus)
                        });
                        if (onTriggerRefresh) onTriggerRefresh();
                      }}
                      className={`text-[10px] font-bold uppercase tracking-wider h-7 ${getStatusChipColor(currentBooking.status)}`}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { py: 0.5, px: 1.5, display: 'flex', alignItems: 'center' },
                        color: 'inherit'
                      }}
                    >
                      <MenuItem value="pending" className="text-xs uppercase font-bold text-gray-400">Pending</MenuItem>
                      <MenuItem value="confirmed" className="text-xs uppercase font-bold text-yellow-400">Confirmed</MenuItem>
                      <MenuItem value="in_progress" className="text-xs uppercase font-bold text-blue-400">In Progress</MenuItem>
                      <MenuItem value="completed" className="text-xs uppercase font-bold text-green-400">Completed</MenuItem>
                      <MenuItem value="cancelled" className="text-xs uppercase font-bold text-red-400">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </DialogTitle>
                <DialogContent className="pt-4 space-y-4">
                  <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/25 p-4 rounded border border-[#D4AF37]/10">
                    <Box>
                      <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block">Total Contract Value</Typography>
                      <Typography variant="h6" className="text-[#D4AF37] font-mono font-bold">{formatCurrency(currentBooking.totalAmount)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block">Paid to Date</Typography>
                      <Typography variant="h6" className="text-green-400 font-mono font-bold">{formatCurrency(currentBooking.paidAmount)}</Typography>
                    </Box>
                    <Box className="sm:col-span-2">
                      <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block">Outstanding Receivables</Typography>
                      <Typography variant="subtitle1" className="text-amber-400 font-mono font-bold">
                        {formatCurrency(currentBooking.totalAmount - currentBooking.paidAmount)}
                      </Typography>
                    </Box>
                  </Box>

                  <List className="p-0 space-y-2">
                    <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                      <ListItemIcon className="min-w-8"><Calendar className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                      <ListItemText 
                        primary={<span className="text-gray-400 text-xs block">Wedding Date</span>} 
                        secondary={<span className="text-white font-serif font-semibold text-sm block mt-0.5">{formatDateToDDMMYYYY(currentBooking.weddingDate)}</span>} 
                      />
                    </ListItem>
                    <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                      <ListItemIcon className="min-w-8"><FileText className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                      <ListItemText 
                        primary={<span className="text-gray-400 text-xs block">Booking For</span>} 
                        secondary={<span className="text-white text-sm block mt-0.5">{currentBooking.bookingFor || 'Wedding'}</span>} 
                      />
                    </ListItem>
                    <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                      <ListItemIcon className="min-w-8"><Users className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                      <ListItemText 
                        primary={<span className="text-gray-400 text-xs block">Coverage</span>} 
                        secondary={<span className="text-white text-sm block mt-0.5">{currentBooking.coverage || 'Both Side'}</span>} 
                      />
                    </ListItem>
                    <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                      <ListItemIcon className="min-w-8"><MapPin className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                      <ListItemText 
                        primary={<span className="text-gray-400 text-xs block">Venue & Coordinates</span>} 
                        secondary={<span className="text-white text-sm block mt-0.5">{currentBooking.venue}</span>} 
                      />
                    </ListItem>
                    {currentBooking.clientEmail && (
                      <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                        <ListItemIcon className="min-w-8"><Mail className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                        <ListItemText 
                          primary={<span className="text-gray-400 text-xs block">Client Email</span>} 
                          secondary={<span className="text-white text-sm block mt-0.5">{currentBooking.clientEmail}</span>} 
                        />
                      </ListItem>
                    )}
                    {currentBooking.clientPhone && (
                      <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                        <ListItemIcon className="min-w-8"><Phone className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                        <ListItemText 
                          primary={<span className="text-gray-400 text-xs block">Client Phone Contact</span>} 
                          secondary={<span className="text-white text-sm block mt-0.5">{currentBooking.clientPhone}</span>} 
                        />
                      </ListItem>
                    )}
                    <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                      <ListItemIcon className="min-w-8"><User className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                      <ListItemText 
                        primary={<span className="text-gray-400 text-xs block">Staff Assignment</span>} 
                        secondary={<span className="text-white text-sm block mt-0.5">{currentBooking.photographer}</span>} 
                      />
                    </ListItem>
                    {currentBooking.assignedFreelancers && currentBooking.assignedFreelancers.length > 0 && (
                      <ListItem className="px-0 py-1.5 border-b border-gold-glow/5">
                        <ListItemIcon className="min-w-8"><Users className="w-4 h-4 text-[#D4AF37]" /></ListItemIcon>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-400 text-xs block">Assigned Freelancers</span>
                          <Box className="flex flex-wrap gap-1 mt-1.5">
                            {currentBooking.assignedFreelancers.map((val) => (
                              <Chip key={val} label={val} size="small" className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] border border-[#D4AF37]/30" />
                            ))}
                          </Box>
                        </div>
                      </ListItem>
                    )}
                  </List>

                  {/* Event-Specific Freelancer Assignments List in Detail dialog */}
                  {currentBooking.freelancerAssignments && currentBooking.freelancerAssignments.length > 0 && (
                    <Box className="space-y-2 pt-3 border-t border-[#D4AF37]/15">
                      <Typography variant="caption" className="text-[#D4AF37] uppercase tracking-widest font-bold text-[10px] block mb-1">
                        Freelancer Event Assignments
                      </Typography>
                      <Box className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {currentBooking.freelancerAssignments.map((assignment, idx) => {
                          const freelancerPhoneLookup = bookings.find(b => b.type === 'freelancer' && b.photographer === assignment.freelancerName)?.freelancerPhone || currentBooking.freelancerPhone || '';
                          
                          const handleSendAssignmentWhatsApp = () => {
                            const message = `Event Type: ${assignment.eventType}
Event Date: ${formatDateToDDMMYYYY(assignment.eventDate)}
Venue: ${assignment.venue}
Per Day Rate: ${settings.currencySymbol}${assignment.perDayRate}
Working Days: ${assignment.workingDays}
Total Payment: ${settings.currencySymbol}${assignment.totalPayment}`;
                            
                            const cleanPhone = freelancerPhoneLookup.replace(/\D/g, '') || '';
                            const encodedText = encodeURIComponent(message);
                            const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          };

                          return (
                            <Box key={idx} className="p-3 bg-black/45 rounded border border-[#D4AF37]/10 space-y-1.5">
                              <div className="flex justify-between items-center">
                                <Typography variant="body2" className="text-[#D4AF37] font-bold text-xs">
                                  {assignment.freelancerName} — {assignment.eventType}
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={handleSendAssignmentWhatsApp}
                                  className="text-[9px] h-5 py-0 bg-green-950/40 border border-green-800/40 text-green-400 font-bold uppercase hover:bg-green-900/30 px-2"
                                >
                                  WhatsApp
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-400">
                                <div>📅 <span className="text-gray-500">Date:</span> {formatDateToDDMMYYYY(assignment.eventDate)}</div>
                                <div>📍 <span className="text-gray-500">Venue:</span> {assignment.venue}</div>
                                <div>💰 <span className="text-gray-500">Rate:</span> {settings.currencySymbol}{assignment.perDayRate}/day</div>
                                <div>⏱️ <span className="text-gray-500">Days:</span> {assignment.workingDays} days</div>
                              </div>
                              <div className="text-right text-[10px] text-emerald-400 font-bold pt-1 border-t border-gray-900/40 font-mono">
                                Total: {settings.currencySymbol}{assignment.totalPayment}
                              </div>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {currentBooking.notes && (
                    <Box className="space-y-1">
                      <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block">Production Directives</Typography>
                      <Box className="p-3 bg-black/20 rounded border border-[#D4AF37]/10 text-xs text-gray-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">
                        {currentBooking.notes}
                      </Box>
                    </Box>
                  )}

                  {/* ⚡ Live Project Status Tracking for Admin */}
                  <Box className="space-y-3 pt-3 border-t border-[#D4AF37]/15">
                    <Typography variant="caption" className="text-[#D4AF37] uppercase tracking-widest font-bold text-[10px] block mb-1">
                      ⚡ Live Project Status Tracking
                    </Typography>
                    <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-black/25 rounded border border-[#D4AF37]/10">
                      {renderStatusDropdown("Photography Status", "photographyStatus", ["Pending", "Shooting in Progress", "Shooting Completed"])}
                      {renderStatusDropdown("Videography Status", "videographyStatus", ["Pending", "Shooting in Progress", "Shooting Completed"])}
                      {renderStatusDropdown("Photo Editing", "photoEditingStatus", ["Pending", "Culling in Progress", "Color Grading", "Retouching", "Completed"])}
                      {renderStatusDropdown("Video Editing", "videoEditingStatus", ["Pending", "Draft Editing", "Color Grading", "Audio Syncing", "Completed"])}
                      
                      {/* 📸 Client Photo Selection Stage */}
                      <Box className="sm:col-span-2 p-3 bg-black/40 border border-[#D4AF37]/20 rounded-lg space-y-2">
                        <Box className="flex items-center justify-between">
                          <Typography variant="caption" className="text-gray-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            📸 Client Photo Selection
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={async () => {
                              if (!currentBooking) return;
                              const stages = ["Pending", "Photo Selection Shared", "Client Selecting Photos", "Photos Selected", "Completed"];
                              const current = currentBooking.clientPhotoSelectionStatus || "Pending";
                              const nextIdx = (stages.indexOf(current) + 1) % stages.length;
                              const nextVal = stages[nextIdx];
                              const updated = { ...currentBooking, clientPhotoSelectionStatus: nextVal };
                              setCurrentBooking(updated);
                              await offlineService.updateBooking(updated);
                              setLastUpdatedStage({
                                bookingId: currentBooking.id,
                                label: "Client Photo Selection Status",
                                value: nextVal
                              });
                              if (onTriggerRefresh) onTriggerRefresh();
                            }}
                            className="text-[10px] text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 py-0.5 px-2 h-6"
                          >
                            One-Click Advance →
                          </Button>
                        </Box>
                        
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {["Pending", "Photo Selection Shared", "Client Selecting Photos", "Photos Selected", "Completed"].map((stage) => {
                            const current = currentBooking?.clientPhotoSelectionStatus || "Pending";
                            const isCurrent = current === stage;
                            return (
                              <button
                                key={stage}
                                onClick={async () => {
                                  if (!currentBooking) return;
                                  const updated = { ...currentBooking, clientPhotoSelectionStatus: stage };
                                  setCurrentBooking(updated);
                                  await offlineService.updateBooking(updated);
                                  setLastUpdatedStage({
                                    bookingId: currentBooking.id,
                                    label: "Client Photo Selection Status",
                                    value: stage
                                  });
                                  if (onTriggerRefresh) onTriggerRefresh();
                                }}
                                className={`text-[10px] px-2.5 py-1 rounded transition-all duration-200 border cursor-pointer ${
                                  isCurrent
                                    ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold"
                                    : "bg-black/40 text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white"
                                }`}
                              >
                                {stage}
                              </button>
                            );
                          })}
                        </div>
                      </Box>

                      {renderStatusDropdown("Album Designing", "albumDesigningStatus", ["Pending", "Layout Finalized", "Client Review", "Completed"])}
                      {renderStatusDropdown("Album Printing", "albumPrintingStatus", ["Pending", "In Queue", "Printing in Progress", "Completed"])}
                      {renderStatusDropdown("Album Delivery", "albumDeliveryStatus", ["Pending", "Shipped", "Delivered"])}
                      {renderStatusDropdown("Video Delivery", "videoDeliveryStatus", ["Pending", "Uploaded to Drive", "Delivered"])}
                      <Box className="sm:col-span-2">
                        {renderStatusDropdown("Overall Project Status", "projectStatus", ["Pending", "In Progress", "Completed", "On Hold"])}
                      </Box>
                    </Box>

                    {lastUpdatedStage && lastUpdatedStage.bookingId === currentBooking.id && (
                      <Box className="p-3 bg-green-950/20 border border-green-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                        <Box className="space-y-0.5">
                          <Typography variant="caption" className="text-green-400 font-bold uppercase tracking-wider text-[10px] block">
                            Status Updated!
                          </Typography>
                          <Typography variant="body2" className="text-gray-300 text-xs">
                            Updated {lastUpdatedStage.label} to "{lastUpdatedStage.value}". Send notification on WhatsApp?
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleSendWhatsAppUpdate}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                          startIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          Send WhatsApp
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {/* 🔗 Client Portal Section */}
                  <Box className="space-y-3 pt-3 border-t border-[#D4AF37]/15">
                    <Typography variant="caption" className="text-[#D4AF37] uppercase tracking-widest font-bold text-[10px] block mb-1">
                      🔗 Client Portal Link
                    </Typography>
                    <Box className="p-4 bg-black/30 border border-[#D4AF37]/15 rounded-lg space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/45 p-2.5 rounded border border-[#D4AF37]/5 font-mono text-xs text-gray-300">
                        <span className="truncate select-all">{`${window.location.origin}/client/${currentBooking.id}`}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => window.open(`${window.location.origin}/client/${currentBooking.id}`, '_blank')}
                          startIcon={<ExternalLink className="w-3.5 h-3.5" />}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 font-bold uppercase text-[10px]"
                        >
                          Open Portal
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            const link = `${window.location.origin}/client/${currentBooking.id}`;
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(link).then(() => alert("Client Portal Link copied to clipboard!")).catch(() => {
                                const ta = document.createElement("textarea");
                                ta.value = link;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand('copy');
                                document.body.removeChild(ta);
                                alert("Client Portal Link copied to clipboard!");
                              });
                            }
                          }}
                          startIcon={<Copy className="w-3.5 h-3.5" />}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 font-bold uppercase text-[10px]"
                        >
                          Copy Link
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            const link = `${window.location.origin}/client/${currentBooking.id}`;
                            if (navigator.share) {
                              navigator.share({
                                title: 'Client Portal - Asmaul Production',
                                text: `Track your shoot live on our Client Portal:`,
                                url: link
                              }).catch(() => {
                                window.open(`https://wa.me/?text=${encodeURIComponent(`Here is your Client Portal link to track your booking: ${link}`)}`, '_blank');
                              });
                            } else {
                              window.open(`https://wa.me/?text=${encodeURIComponent(`Here is your Client Portal link to track your booking: ${link}`)}`, '_blank');
                            }
                          }}
                          startIcon={<Share2 className="w-3.5 h-3.5" />}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 font-bold uppercase text-[10px]"
                        >
                          Share Link
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setQrCodeLink(`${window.location.origin}/client/${currentBooking.id}`);
                            setQrCodeOpen(true);
                          }}
                          startIcon={<QrCode className="w-3.5 h-3.5" />}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 font-bold uppercase text-[10px]"
                        >
                          Generate QR
                        </Button>
                      </div>
                    </Box>
                  </Box>

                  {/* 📄 Agreement Section */}
                  <Box className="space-y-3 pt-3 border-t border-[#D4AF37]/15">
                    <Typography variant="caption" className="text-[#D4AF37] uppercase tracking-widest font-bold text-[10px] block mb-1">
                      📄 Agreement
                    </Typography>
                    <Box className="p-4 bg-black/30 border border-[#D4AF37]/15 rounded-lg space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/45 p-2.5 rounded border border-[#D4AF37]/5 text-xs text-gray-300">
                        <div>
                          <p className="font-serif font-bold text-sm text-[#D4AF37]">Wedding Photography & Cinematography Agreement</p>
                          <p className="text-gray-500 text-[10px] mt-0.5 font-mono">Auto-Generate luxury print-ready agreement</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          onClick={() => {
                            setPdfActionData({
                              title: 'Wedding Agreement',
                              subtitle: 'View, download, print, or transmit the commercial wedding agreement document.',
                              clientName: currentBooking.clientName,
                              documentType: 'Agreement',
                              booking: currentBooking
                            });
                            setPdfActionOpen(true);
                          }}
                          startIcon={<FileText className="w-3.5 h-3.5" />}
                          className="bg-amber-950/40 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-amber-900/30 font-bold uppercase text-[10px]"
                        >
                          Generate Agreement
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={async () => {
                            const doc = await buildAgreementPDF(currentBooking, settings);
                            const url = doc.output('bloburl') as any as string;
                            setPdfPreviewUrl(url);
                            setPdfPreviewTitle(`Wedding Agreement Preview`);
                            setPdfPreviewFilename(`agreement_document_${currentBooking.id.slice(0, 8).toUpperCase()}.pdf`);
                            setPdfPreviewDoc(doc);
                            setPdfPreviewOpen(true);
                          }}
                          startIcon={<Eye className="w-3.5 h-3.5" />}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 font-bold uppercase text-[10px]"
                        >
                          Preview
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={async () => {
                            await downloadAgreementPDF(currentBooking, settings);
                          }}
                          startIcon={<Download className="w-3.5 h-3.5" />}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 font-bold uppercase text-[10px]"
                        >
                          Download PDF
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={async () => {
                            const doc = await buildAgreementPDF(currentBooking, settings);
                            const filename = `agreement_document_${currentBooking.id.slice(0, 8).toUpperCase()}.pdf`;
                            const messageText = `📸 *${settings.studioName || 'Asmaul Production'}*\n\nHello *${currentBooking.clientName}*,\n\nPlease find the *Wedding Photography & Cinematography Agreement* for your booking on *${formatDateToDDMMYYYY(currentBooking.weddingDate)}* attached.\n\n*Agreement No:* AGR-${currentBooking.id.slice(0, 8).toUpperCase()}\n*Selected Package:* ${currentBooking.packageName}\n*Total Package Value:* ₹${currentBooking.totalAmount.toLocaleString('en-IN')}\n*Outstanding Due:* ₹${(currentBooking.totalAmount - currentBooking.paidAmount).toLocaleString('en-IN')}\n\nKindly review and print the terms and conditions in the document.\n\nThank you for choosing ${settings.studioName || 'Asmaul Production'}.`;
                            await handlePDFActions(doc, filename, 'whatsapp', messageText, currentBooking.clientPhone || '');
                          }}
                          startIcon={<Send className="w-3.5 h-3.5" />}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/5 font-bold uppercase text-[10px]"
                        >
                          Send via WhatsApp
                        </Button>
                      </div>
                    </Box>
                  </Box>
                </DialogContent>
                <DialogActions className="border-t border-[#D4AF37]/15 p-3 flex justify-between items-center w-full">
                  <Box className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setPdfActionData({
                          title: 'Booking Confirmation',
                          subtitle: 'View, download or transmit your shoot confirmation document.',
                          clientName: currentBooking.clientName,
                          documentType: 'Booking Confirmation',
                          booking: currentBooking
                        });
                        setPdfActionOpen(true);
                      }} 
                      variant="contained" 
                      color="secondary" 
                      size="small"
                      startIcon={<Download className="w-4 h-4" />}
                      className="bg-amber-950/40 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-amber-900/30 text-[10px] sm:text-xs py-1"
                    >
                      Confirm PDF
                    </Button>
                    <Button 
                      onClick={() => {
                        setPdfActionData({
                          title: 'Invoice',
                          subtitle: 'View, download or transmit your invoice document.',
                          clientName: currentBooking.clientName,
                          documentType: 'Invoice',
                          booking: currentBooking
                        });
                        setPdfActionOpen(true);
                      }} 
                      variant="contained" 
                      color="secondary" 
                      size="small"
                      startIcon={<Download className="w-4 h-4" />}
                      className="bg-amber-950/40 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-amber-900/30 text-[10px] sm:text-xs py-1"
                    >
                      Invoice PDF
                    </Button>
                  </Box>
                  <Box className="flex gap-2">
                    <Button onClick={() => handleOpenEditForm(currentBooking)} variant="outlined" size="small" className="border-[#D4AF37]/50 text-[#D4AF37]">
                      Edit Contract
                    </Button>
                    <Button onClick={() => setDetailOpen(false)} color="inherit" size="small">
                      Close
                    </Button>
                  </Box>
                </DialogActions>
              </>
            )}
          </>
        )}
      </Dialog>

      {/* --- CONFIRM DELETE DIALOG --- */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle className="font-serif">Purge Record Archive?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-gray-400">
            Warning: This action will permanently remove the wedding booking record from your local IndexedDB log and queue a delete sync to fire on Firestore. This operation cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions className="p-3">
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit" size="small">
            Retain
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" size="small">
            Purge Forever
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- WHATSAPP NOTIFICATION DISPATCH DIALOG --- */}
      <Dialog 
        open={whatsappDialogOpen} 
        onClose={() => setWhatsappDialogOpen(false)} 
        fullWidth 
        maxWidth="md"
        sx={{
          '& .MuiDialog-paper': {
            background: '#121212',
            border: '1px solid #D4AF37/30',
            color: '#ffffff'
          }
        }}
      >
        <DialogTitle component="div" className="border-b border-[#D4AF37]/20 pb-3">
          <Typography variant="h5" className="text-gold-gradient font-bold font-serif flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
            DISPATCH WHATSAPP NOTIFICATION
          </Typography>
          <Typography variant="caption" className="text-gray-400 text-[11px] uppercase tracking-wider block">
            Automated Contract Outsource Notification System
          </Typography>
        </DialogTitle>
        
        <DialogContent className="pt-4 space-y-4">
          {whatsappDispatchStep === 'idle' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Live Field Updates */}
              <div className="lg:col-span-5 space-y-4 border-r border-[#D4AF37]/10 lg:pr-5">
                <Typography variant="subtitle2" className="text-[#D4AF37] font-semibold text-xs uppercase tracking-wider">
                  Dispatch Variables
                </Typography>
                
                <TextField
                  fullWidth
                  label="Freelancer WhatsApp Number"
                  placeholder="e.g. +91 98765 43210"
                  value={whatsappRecipientPhone}
                  onChange={(e) => setWhatsappRecipientPhone(e.target.value)}
                  required
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><Phone className="w-4 h-4 text-[#D4AF37]" /></InputAdornment>
                    }
                  }}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    fullWidth
                    size="small"
                    label="Bride Name"
                    value={whatsappBrideName}
                    onChange={(e) => setWhatsappBrideName(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Groom Name"
                    value={whatsappGroomName}
                    onChange={(e) => setWhatsappGroomName(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    fullWidth
                    size="small"
                    label="Event Time"
                    value={whatsappEventTime}
                    onChange={(e) => setWhatsappEventTime(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Reporting Time"
                    value={whatsappReportingTime}
                    onChange={(e) => setWhatsappReportingTime(e.target.value)}
                  />
                </div>
                
                <Box className="p-3 bg-black/40 rounded border border-[#D4AF37]/10 text-[11px] text-gray-400 leading-relaxed">
                  <div className="font-bold text-amber-500 flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    DISPATCH NOTES
                  </div>
                  Modifying variables on the left dynamically regenerates the production-grade message draft template seen on the right. You can also directly type and edit the final template box.
                </Box>
              </div>
              
              {/* Right Column: Live Chat Message Preview */}
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <Typography variant="subtitle2" className="text-[#D4AF37] font-semibold text-xs uppercase tracking-wider flex justify-between items-center">
                  <span>Live Dispatch Preview</span>
                  <span className="text-[10px] font-mono font-normal text-gray-500">Recipient: {whatsappRecipientPhone || 'unspecified'}</span>
                </Typography>
                
                <div className="flex-grow p-4 bg-[#0d140e] rounded border border-green-900/40 relative flex flex-col justify-between min-h-[300px]">
                  {/* Decorative Mock WhatsApp Header */}
                  <div className="absolute top-0 left-0 right-0 h-8 bg-[#121b14] border-b border-green-950 flex items-center px-3 justify-between rounded-t">
                    <span className="text-[10px] text-green-500 font-bold font-mono tracking-widest uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Studio Telegram Dispatch
                    </span>
                    <span className="text-[9px] text-gray-500">{settings.studioName}</span>
                  </div>
                  
                  {/* Message body text area */}
                  <textarea
                    className="w-full bg-transparent border-0 outline-0 ring-0 text-gray-200 font-mono text-[11px] leading-relaxed resize-none mt-6 flex-grow custom-scrollbar"
                    style={{ minHeight: '260px' }}
                    value={whatsappCustomMessage}
                    onChange={(e) => setWhatsappCustomMessage(e.target.value)}
                  />
                  
                  <div className="text-[9px] text-green-700 text-right mt-2 font-mono">
                    Character Count: {whatsappCustomMessage.length}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Confirming status view */
            <Box className="flex flex-col items-center justify-center py-8 text-center space-y-6 max-w-md mx-auto">
              <Box className="relative">
                <div className="w-20 h-20 rounded-full bg-green-950/40 border-2 border-green-500/50 flex items-center justify-center animate-pulse">
                  <Send className="w-10 h-10 text-green-400" />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-green-500 text-black p-1 rounded-full border border-black">
                  <Check className="w-4 h-4 font-bold" />
                </span>
              </Box>
              
              <Box className="space-y-2">
                <Typography variant="h6" className="text-white font-serif font-bold">
                  Confirm Dispatch Transmission
                </Typography>
                <Typography variant="body2" className="text-gray-400 leading-relaxed text-xs">
                  We have successfully generated and launched the pre-filled dispatch to WhatsApp Web for <strong className="text-white">{whatsappTargetBooking?.photographer}</strong> at <strong className="text-white">{whatsappRecipientPhone}</strong> in a new browser window.
                </Typography>
                <Typography variant="caption" className="text-amber-500/80 italic text-[11px] block mt-1">
                  Did the contractor successfully receive/confirm the message payload?
                </Typography>
              </Box>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleMarkAsSent}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 normal-case"
                >
                  <Check className="w-4 h-4" />
                  Yes, Message Delivered
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleMarkAsFailed}
                  className="border-red-900 hover:bg-red-950 text-red-400 font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 normal-case"
                >
                  <AlertCircle className="w-4 h-4" />
                  No, Log Delivery Failure
                </Button>
              </div>
              
              <Button
                variant="text"
                size="small"
                onClick={handleDispatchWhatsApp}
                className="text-gray-400 hover:text-white normal-case text-xs flex items-center gap-1 mt-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-open WhatsApp Link
              </Button>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions className="border-t border-[#D4AF37]/15 p-4 justify-between bg-black/40">
          {whatsappDispatchStep === 'idle' ? (
            <>
              <Button 
                onClick={() => setWhatsappDialogOpen(false)} 
                color="inherit" 
                size="small"
                className="normal-case text-xs"
              >
                Dismiss Draft
              </Button>
              <Button
                variant="contained"
                onClick={handleDispatchWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white font-bold normal-case text-xs px-4 py-1.5 flex items-center gap-2"
                disabled={!whatsappRecipientPhone}
              >
                <Send className="w-4 h-4" />
                Launch WhatsApp Dispatch
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setWhatsappDispatchStep('idle')}
              color="inherit"
              size="small"
              className="normal-case text-xs"
            >
              ← Edit Message Parameters
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* PDFActionsTriggerDialog for client-facing PDF flows */}
      {pdfActionOpen && pdfActionData && (
        <PDFActionsTriggerDialog
          open={pdfActionOpen}
          onClose={() => setPdfActionOpen(false)}
          title={pdfActionData.title}
          subtitle={pdfActionData.subtitle}
          clientName={pdfActionData.clientName}
          documentType={pdfActionData.documentType}
          onAction={handleTriggerPdfAction}
        />
      )}

      {/* PDFPreviewDialog to view PDFs inline securely */}
      {pdfPreviewOpen && (
        <PDFPreviewDialog
          open={pdfPreviewOpen}
          onClose={() => {
            setPdfPreviewOpen(false);
            if (pdfPreviewUrl) {
              URL.revokeObjectURL(pdfPreviewUrl);
              setPdfPreviewUrl(null);
            }
          }}
          pdfUrl={pdfPreviewUrl}
          title={pdfPreviewTitle}
          filename={pdfPreviewFilename}
          onDownload={() => {
            if (pdfPreviewDoc) {
              pdfPreviewDoc.save(pdfPreviewFilename);
            }
          }}
        />
      )}

      {/* QR Code Modal for Client Portal Sharing */}
      <Dialog open={qrCodeOpen} onClose={() => setQrCodeOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle className="border-b border-[#D4AF37]/20 text-center">
          <Typography variant="h6" className="text-gold-gradient font-serif font-bold">
            Client Portal QR Code
          </Typography>
        </DialogTitle>
        <DialogContent className="pt-6 pb-6 flex flex-col items-center justify-center space-y-4 text-center">
          <Typography variant="caption" className="text-gray-400 max-w-xs uppercase tracking-wider block">
            Scan this QR code with any mobile device to access your personalized Client Portal instantly.
          </Typography>
          
          <Box className="p-3 bg-white rounded-lg border-2 border-[#D4AF37]/50 flex items-center justify-center shadow-lg">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeLink)}`}
              alt="Client Portal QR Code"
              className="w-48 h-48"
              referrerPolicy="no-referrer"
            />
          </Box>
          
          <Typography variant="body2" className="text-gray-300 font-mono text-[10px] bg-black/45 px-3 py-1.5 rounded border border-[#D4AF37]/10 w-full truncate">
            {qrCodeLink}
          </Typography>
        </DialogContent>
        <DialogActions className="border-t border-[#D4AF37]/15 p-3 justify-center">
          <Button onClick={() => setQrCodeOpen(false)} variant="contained" className="bg-[#D4AF37] hover:bg-[#bfa032] text-black font-bold normal-case text-xs px-6">
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
