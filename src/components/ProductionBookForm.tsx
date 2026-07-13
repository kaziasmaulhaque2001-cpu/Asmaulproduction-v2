import React from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  IconButton,
  ListItemText
} from '@mui/material';
import {
  User,
  FileText,
  CalendarClock,
  CreditCard,
  CheckSquare,
  Users,
  FileSignature,
  Trash2
} from 'lucide-react';
import { Booking, FreelancerAssignment } from '../types';
import { formatDateToDDMMYYYY } from '../utils/pdfGenerator';

interface ProductionBookFormProps {
  clientName: string;
  setClientName: (val: string) => void;
  clientEmail: string;
  setClientEmail: (val: string) => void;
  clientPhone: string;
  setClientPhone: (val: string) => void;
  weddingDate: string;
  setWeddingDate: (val: string) => void;
  venue: string;
  setVenue: (val: string) => void;
  packageName: string;
  setPackageName: (val: string) => void;
  totalAmount: number | '';
  setTotalAmount: (val: number | '') => void;
  paidAmount: number | '';
  setPaidAmount: (val: number | '') => void;
  status: Booking['status'];
  setStatus: (val: Booking['status']) => void;
  photographer: string;
  setPhotographer: (val: string) => void;
  leadCinematographer: string;
  setLeadCinematographer: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  contactPersonName: string;
  setContactPersonName: (val: string) => void;
  altContactNumber: string;
  setAltContactNumber: (val: string) => void;
  fullAddress: string;
  setFullAddress: (val: string) => void;
  
  preWedding: 'Yes' | 'No';
  setPreWedding: (val: 'Yes' | 'No') => void;
  preWeddingDate: string;
  setPreWeddingDate: (val: string) => void;
  preWeddingLocation: string;
  setPreWeddingLocation: (val: string) => void;
  preWeddingTime: string;
  setPreWeddingTime: (val: string) => void;
  
  receptionDate: string;
  setReceptionDate: (val: string) => void;
  receptionLocation: string;
  setReceptionLocation: (val: string) => void;
  receptionTime: string;
  setReceptionTime: (val: string) => void;

  mehendiIncluded: 'Yes' | 'No';
  setMehendiIncluded: (val: 'Yes' | 'No') => void;
  mehendiDate: string;
  setMehendiDate: (val: string) => void;
  mehendiTime: string;
  setMehendiTime: (val: string) => void;
  mehendiLocation: string;
  setMehendiLocation: (val: string) => void;

  haldiIncluded: 'Yes' | 'No';
  setHaldiIncluded: (val: 'Yes' | 'No') => void;
  haldiDate: string;
  setHaldiDate: (val: string) => void;
  haldiTime: string;
  setHaldiTime: (val: string) => void;
  haldiLocation: string;
  setHaldiLocation: (val: string) => void;

  boubhatIncluded: 'Yes' | 'No';
  setBoubhatIncluded: (val: 'Yes' | 'No') => void;
  boubhatDate: string;
  setBoubhatDate: (val: string) => void;
  boubhatTime: string;
  setBoubhatTime: (val: string) => void;
  boubhatLocation: string;
  setBoubhatLocation: (val: string) => void;

  aiburobhatIncluded: 'Yes' | 'No';
  setAiburobhatIncluded: (val: 'Yes' | 'No') => void;
  aiburobhatDate: string;
  setAiburobhatDate: (val: string) => void;
  aiburobhatTime: string;
  setAiburobhatTime: (val: string) => void;
  aiburobhatLocation: string;
  setAiburobhatLocation: (val: string) => void;

  bidayIncluded: 'Yes' | 'No';
  setBidayIncluded: (val: 'Yes' | 'No') => void;
  bidayDate: string;
  setBidayDate: (val: string) => void;
  bidayTime: string;
  setBidayTime: (val: string) => void;
  bidayLocation: string;
  setBidayLocation: (val: string) => void;

  payment1: number | '';
  setPayment1: (val: number | '') => void;
  payment2: number | '';
  setPayment2: (val: number | '') => void;

  pkgAlbum: 'Yes' | 'No';
  setPkgAlbum: (val: 'Yes' | 'No') => void;
  pkgAlbumSize: string;
  setPkgAlbumSize: (val: string) => void;
  pkgAlbumQty: number | '';
  setPkgAlbumQty: (val: number | '') => void;
  
  pkgFrame: 'Yes' | 'No';
  setPkgFrame: (val: 'Yes' | 'No') => void;
  pkgFrameSize: string;
  setPkgFrameSize: (val: string) => void;
  pkgFrameQty: number | '';
  setPkgFrameQty: (val: number | '') => void;
  
  pkgPendriveSize: string;
  setPkgPendriveSize: (val: string) => void;
  pkgPendriveQty: number | '';
  setPkgPendriveQty: (val: number | '') => void;
  pkgEditedPhotosCount: number | '';
  setPkgEditedPhotosCount: (val: number | '') => void;

  pkgStandardVideoEditing: 'Yes' | 'No';
  setPkgStandardVideoEditing: (val: 'Yes' | 'No') => void;
  pkgCinematicVideoEditing: 'Yes' | 'No';
  setPkgCinematicVideoEditing: (val: 'Yes' | 'No') => void;
  pkgRawVideo: 'Yes' | 'No';
  setPkgRawVideo: (val: 'Yes' | 'No') => void;
  pkgShortTrailer: 'Yes' | 'No';
  setPkgShortTrailer: (val: 'Yes' | 'No') => void;
  pkgDroneCoverage: 'Yes' | 'No';
  setPkgDroneCoverage: (val: 'Yes' | 'No') => void;
  pkgLedWall: 'Yes' | 'No';
  setPkgLedWall: (val: 'Yes' | 'No') => void;
  pkgCrane: 'Yes' | 'No';
  setPkgCrane: (val: 'Yes' | 'No') => void;
  pkgLiveStreaming: 'Yes' | 'No';
  setPkgLiveStreaming: (val: 'Yes' | 'No') => void;

  assignedFreelancers: string[];
  setAssignedFreelancers: (val: string[]) => void;
  freelancerAssignments: FreelancerAssignment[];
  setFreelancerAssignments: (val: FreelancerAssignment[]) => void;
  
  handleAddAssignmentRow: () => void;
  handleRemoveAssignmentRow: (index: number) => void;
  handleUpdateAssignmentRow: (index: number, field: keyof FreelancerAssignment, value: any) => void;

  bookingFor: string;
  setBookingFor: (val: string) => void;
  coverage: string;
  setCoverage: (val: string) => void;
  brideName: string;
  setBrideName: (val: string) => void;
  groomName: string;
  setGroomName: (val: string) => void;
  eventTime: string;
  setEventTime: (val: string) => void;
  reportingTime: string;
  setReportingTime: (val: string) => void;

  settings: {
    packages: string[];
    photographers: string[];
    cinematographers?: string[];
    currencySymbol: string;
    invoiceTerms?: string;
  };
  isEditMode: boolean;
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  required?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
}

const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  required,
  size = 'small',
  fullWidth = true,
  disabled = false,
}) => {
  const displayValue = value ? formatDateToDDMMYYYY(value) : '';

  if (disabled) {
    return (
      <TextField
        fullWidth={fullWidth}
        size={size}
        label={label}
        value={displayValue || 'No date set'}
        disabled
        slotProps={{ inputLabel: { shrink: true } }}
      />
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', display: 'inline-flex' }}>
      {/* Invisible native date input on top */}
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          zIndex: 2,
          cursor: 'pointer',
        }}
      />
      {/* Visible styled TextField */}
      <TextField
        fullWidth={fullWidth}
        size={size}
        label={label}
        value={displayValue}
        required={required}
        slotProps={{
          inputLabel: { shrink: !!value },
        }}
        sx={{
          pointerEvents: 'none',
          '& .MuiInputBase-input': {
            pointerEvents: 'none',
          },
        }}
      />
    </Box>
  );
};

export const ProductionBookForm: React.FC<ProductionBookFormProps> = ({
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  clientPhone,
  setClientPhone,
  weddingDate,
  setWeddingDate,
  venue,
  setVenue,
  packageName,
  setPackageName,
  totalAmount,
  setTotalAmount,
  paidAmount,
  setPaidAmount,
  status,
  setStatus,
  photographer,
  setPhotographer,
  leadCinematographer,
  setLeadCinematographer,
  notes,
  setNotes,
  contactPersonName,
  setContactPersonName,
  altContactNumber,
  setAltContactNumber,
  fullAddress,
  setFullAddress,
  
  preWedding,
  setPreWedding,
  preWeddingDate,
  setPreWeddingDate,
  preWeddingLocation,
  setPreWeddingLocation,
  preWeddingTime,
  setPreWeddingTime,
  
  receptionDate,
  setReceptionDate,
  receptionLocation,
  setReceptionLocation,
  receptionTime,
  setReceptionTime,

  mehendiIncluded,
  setMehendiIncluded,
  mehendiDate,
  setMehendiDate,
  mehendiTime,
  setMehendiTime,
  mehendiLocation,
  setMehendiLocation,

  haldiIncluded,
  setHaldiIncluded,
  haldiDate,
  setHaldiDate,
  haldiTime,
  setHaldiTime,
  haldiLocation,
  setHaldiLocation,

  boubhatIncluded,
  setBoubhatIncluded,
  boubhatDate,
  setBoubhatDate,
  boubhatTime,
  setBoubhatTime,
  boubhatLocation,
  setBoubhatLocation,

  aiburobhatIncluded,
  setAiburobhatIncluded,
  aiburobhatDate,
  setAiburobhatDate,
  aiburobhatTime,
  setAiburobhatTime,
  aiburobhatLocation,
  setAiburobhatLocation,

  bidayIncluded,
  setBidayIncluded,
  bidayDate,
  setBidayDate,
  bidayTime,
  setBidayTime,
  bidayLocation,
  setBidayLocation,

  payment1,
  setPayment1,
  payment2,
  setPayment2,

  pkgAlbum,
  setPkgAlbum,
  pkgAlbumSize,
  setPkgAlbumSize,
  pkgAlbumQty,
  setPkgAlbumQty,
  
  pkgFrame,
  setPkgFrame,
  pkgFrameSize,
  setPkgFrameSize,
  pkgFrameQty,
  setPkgFrameQty,
  
  pkgPendriveSize,
  setPkgPendriveSize,
  pkgPendriveQty,
  setPkgPendriveQty,
  pkgEditedPhotosCount,
  setPkgEditedPhotosCount,

  pkgStandardVideoEditing,
  setPkgStandardVideoEditing,
  pkgCinematicVideoEditing,
  setPkgCinematicVideoEditing,
  pkgRawVideo,
  setPkgRawVideo,
  pkgShortTrailer,
  setPkgShortTrailer,
  pkgDroneCoverage,
  setPkgDroneCoverage,
  pkgLedWall,
  setPkgLedWall,
  pkgCrane,
  setPkgCrane,
  pkgLiveStreaming,
  setPkgLiveStreaming,

  assignedFreelancers,
  setAssignedFreelancers,
  freelancerAssignments,
  setFreelancerAssignments,
  
  handleAddAssignmentRow,
  handleRemoveAssignmentRow,
  handleUpdateAssignmentRow,

  bookingFor,
  setBookingFor,
  coverage,
  setCoverage,
  brideName,
  setBrideName,
  groomName,
  setGroomName,
  eventTime,
  setEventTime,
  reportingTime,
  setReportingTime,

  settings,
  isEditMode
}) => {
  return (
    <div className="space-y-6">
      {/* =========================================
          SECTION 1: CLIENT INFORMATION
          ========================================= */}
      <Box className="p-4 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-2">
          <User className="w-4 h-4 text-[#D4AF37]" />
          <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
            Section 1: Client Information
          </Typography>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            fullWidth
            label="Client Marriage Name"
            placeholder="e.g. Eleanor & Charles"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
          <TextField
            fullWidth
            label="Contact Person Name"
            placeholder="Name of primary contact"
            value={contactPersonName}
            onChange={(e) => setContactPersonName(e.target.value)}
          />
        </div>

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
            label="Alternate Phone"
            placeholder="e.g. +91 98765 43210"
            value={altContactNumber}
            onChange={(e) => setAltContactNumber(e.target.value)}
          />
          <TextField
            fullWidth
            label="Full Address"
            placeholder="Billing/Shipping Address"
            multiline
            rows={2}
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
          />
        </div>
      </Box>

      {/* =========================================
          SECTION 2: BOOKING INFORMATION
          ========================================= */}
      <Box className="p-4 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-2">
          <FileText className="w-4 h-4 text-[#D4AF37]" />
          <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
            Section 2: Booking Information
          </Typography>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DateField
            fullWidth
            label="Wedding Date"
            value={weddingDate}
            onChange={setWeddingDate}
            required
          />
          <TextField
            fullWidth
            label="Event Time"
            placeholder="e.g. 12:00 PM"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
          />
          <TextField
            fullWidth
            label="Reporting Time"
            placeholder="e.g. 11:00 AM"
            value={reportingTime}
            onChange={(e) => setReportingTime(e.target.value)}
          />
        </div>

        <TextField
          fullWidth
          label="Wedding Venue & Location"
          placeholder="e.g. Chateau Montelena, Calistoga"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
        />
      </Box>

      {/* =========================================
          SECTION 3: EVENT SCHEDULE
          ========================================= */}
      <Box className="p-4 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-2">
          <CalendarClock className="w-4 h-4 text-[#D4AF37]" />
          <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
            Section 3: Event Schedule
          </Typography>
        </div>

        {/* Selection Checkboxes/Toggles */}
        <Box className="p-3 bg-black/40 rounded-lg border border-[#D4AF37]/5">
          <Typography className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">
            Select Events Included in Coverage:
          </Typography>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FormControlLabel
              control={
                <Checkbox
                  checked={true}
                  disabled
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Wedding (Main)</span>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preWedding === 'Yes'}
                  onChange={(e) => setPreWedding(e.target.checked ? 'Yes' : 'No')}
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Pre Wedding</span>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={mehendiIncluded === 'Yes'}
                  onChange={(e) => setMehendiIncluded(e.target.checked ? 'Yes' : 'No')}
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Mehendi</span>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={haldiIncluded === 'Yes'}
                  onChange={(e) => setHaldiIncluded(e.target.checked ? 'Yes' : 'No')}
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Haldi</span>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={receptionDate !== '' || receptionLocation !== '' || (bookingFor === 'Reception')}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setReceptionDate('');
                      setReceptionLocation('');
                    } else {
                      setReceptionDate(weddingDate); // default to wedding date
                    }
                  }}
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Reception</span>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={boubhatIncluded === 'Yes'}
                  onChange={(e) => setBoubhatIncluded(e.target.checked ? 'Yes' : 'No')}
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Boubhat</span>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={aiburobhatIncluded === 'Yes'}
                  onChange={(e) => setAiburobhatIncluded(e.target.checked ? 'Yes' : 'No')}
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Aiburobhat</span>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={bidayIncluded === 'Yes'}
                  onChange={(e) => setBidayIncluded(e.target.checked ? 'Yes' : 'No')}
                  size="small"
                  className="text-[#D4AF37]"
                />
              }
              label={<span className="text-xs font-semibold text-gray-300">Biday</span>}
            />
          </div>
        </Box>

        {/* Responsive cards for selected events */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Always Wedding */}
          <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
            <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
              💍 Wedding (Main Event)
            </Typography>
            <div className="grid grid-cols-1 gap-2.5">
              <DateField
                fullWidth
                size="small"
                label="Wedding Date"
                value={weddingDate}
                onChange={setWeddingDate}
                required
              />
              <TextField
                fullWidth
                size="small"
                label="Wedding Time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="Wedding Location"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
          </Box>

          {/* Pre Wedding */}
          {preWedding === 'Yes' && (
            <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
              <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
                📸 Pre Wedding
              </Typography>
              <div className="grid grid-cols-1 gap-2.5">
                <DateField
                  fullWidth
                  size="small"
                  label="Pre Wedding Date"
                  value={preWeddingDate}
                  onChange={setPreWeddingDate}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Pre Wedding Time"
                  value={preWeddingTime}
                  onChange={(e) => setPreWeddingTime(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Pre Wedding Location"
                  value={preWeddingLocation}
                  onChange={(e) => setPreWeddingLocation(e.target.value)}
                />
              </div>
            </Box>
          )}

          {/* Mehendi */}
          {mehendiIncluded === 'Yes' && (
            <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
              <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
                🌿 Mehendi
              </Typography>
              <div className="grid grid-cols-1 gap-2.5">
                <DateField
                  fullWidth
                  size="small"
                  label="Mehendi Date"
                  value={mehendiDate}
                  onChange={setMehendiDate}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Mehendi Time"
                  value={mehendiTime}
                  onChange={(e) => setMehendiTime(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Mehendi Location"
                  value={mehendiLocation}
                  onChange={(e) => setMehendiLocation(e.target.value)}
                />
              </div>
            </Box>
          )}

          {/* Haldi */}
          {haldiIncluded === 'Yes' && (
            <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
              <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
                💛 Haldi
              </Typography>
              <div className="grid grid-cols-1 gap-2.5">
                <DateField
                  fullWidth
                  size="small"
                  label="Haldi Date"
                  value={haldiDate}
                  onChange={setHaldiDate}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Haldi Time"
                  value={haldiTime}
                  onChange={(e) => setHaldiTime(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Haldi Location"
                  value={haldiLocation}
                  onChange={(e) => setHaldiLocation(e.target.value)}
                />
              </div>
            </Box>
          )}

          {/* Reception */}
          {(receptionDate !== '' || receptionLocation !== '' || bookingFor === 'Reception') && (
            <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
              <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
                🥂 Reception
              </Typography>
              <div className="grid grid-cols-1 gap-2.5">
                <DateField
                  fullWidth
                  size="small"
                  label="Reception Date"
                  value={receptionDate}
                  onChange={setReceptionDate}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Reception Time"
                  value={receptionTime}
                  onChange={(e) => setReceptionTime(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Reception Location"
                  value={receptionLocation}
                  onChange={(e) => setReceptionLocation(e.target.value)}
                />
              </div>
            </Box>
          )}

          {/* Boubhat */}
          {boubhatIncluded === 'Yes' && (
            <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
              <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
                🍽️ Boubhat
              </Typography>
              <div className="grid grid-cols-1 gap-2.5">
                <DateField
                  fullWidth
                  size="small"
                  label="Boubhat Date"
                  value={boubhatDate}
                  onChange={setBoubhatDate}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Boubhat Time"
                  value={boubhatTime}
                  onChange={(e) => setBoubhatTime(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Boubhat Location"
                  value={boubhatLocation}
                  onChange={(e) => setBoubhatLocation(e.target.value)}
                />
              </div>
            </Box>
          )}

          {/* Aiburobhat */}
          {aiburobhatIncluded === 'Yes' && (
            <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
              <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
                🍲 Aiburobhat
              </Typography>
              <div className="grid grid-cols-1 gap-2.5">
                <DateField
                  fullWidth
                  size="small"
                  label="Aiburobhat Date"
                  value={aiburobhatDate}
                  onChange={setAiburobhatDate}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Aiburobhat Time"
                  value={aiburobhatTime}
                  onChange={(e) => setAiburobhatTime(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Aiburobhat Location"
                  value={aiburobhatLocation}
                  onChange={(e) => setAiburobhatLocation(e.target.value)}
                />
              </div>
            </Box>
          )}

          {/* Biday */}
          {bidayIncluded === 'Yes' && (
            <Box className="p-3 bg-black/40 rounded-xl border border-[#D4AF37]/20 space-y-3">
              <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4AF37]/10 pb-1.5">
                🚗 Biday
              </Typography>
              <div className="grid grid-cols-1 gap-2.5">
                <DateField
                  fullWidth
                  size="small"
                  label="Biday Date"
                  value={bidayDate}
                  onChange={setBidayDate}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Biday Time"
                  value={bidayTime}
                  onChange={(e) => setBidayTime(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Biday Location"
                  value={bidayLocation}
                  onChange={(e) => setBidayLocation(e.target.value)}
                />
              </div>
            </Box>
          )}
        </div>
      </Box>

      {/* =========================================
          SECTION 4: PAYMENT INFORMATION
          ========================================= */}
      <Box className="p-4 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-2">
          <CreditCard className="w-4 h-4 text-[#D4AF37]" />
          <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
            Section 4: Payment Information
          </Typography>
        </div>

        {/* Statistic Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Box className="p-3 bg-gradient-to-br from-black/50 to-black/30 border border-gray-800 rounded-xl flex flex-col justify-between">
            <Typography className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              Total Contract
            </Typography>
            <Typography className="text-sm sm:text-base text-emerald-400 font-mono font-bold mt-1">
              {settings.currencySymbol}{Number(totalAmount || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box className="p-3 bg-gradient-to-br from-black/50 to-black/30 border border-gray-800 rounded-xl flex flex-col justify-between">
            <Typography className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              Advance Paid
            </Typography>
            <Typography className="text-sm sm:text-base text-amber-500 font-mono font-bold mt-1">
              {settings.currencySymbol}{Number(paidAmount || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box className="p-3 bg-gradient-to-br from-black/50 to-black/30 border border-gray-800 rounded-xl flex flex-col justify-between">
            <Typography className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              Total Paid
            </Typography>
            <Typography className="text-sm sm:text-base text-blue-400 font-mono font-bold mt-1">
              {settings.currencySymbol}{Number(paidAmount || 0).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box className="p-3 bg-gradient-to-br from-black/50 to-black/30 border border-gray-800 rounded-xl flex flex-col justify-between">
            <Typography className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              Remaining Due
            </Typography>
            <Typography className="text-sm sm:text-base text-red-400 font-mono font-bold mt-1">
              {settings.currencySymbol}{(Number(totalAmount || 0) - Number(paidAmount || 0)).toLocaleString('en-IN')}
            </Typography>
          </Box>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <TextField
            fullWidth
            label={`Total Contract Amount (${settings.currencySymbol})`}
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
            fullWidth
            label={`Advance Amount (${settings.currencySymbol})`}
            type="number"
            placeholder="Advance/Retainer paid"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value !== '' ? Number(e.target.value) : '')}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">{settings.currencySymbol}</InputAdornment>,
              }
            }}
          />
          <TextField
            fullWidth
            label={`1st Payment Due (${settings.currencySymbol})`}
            type="number"
            placeholder="Scheduled first installment"
            value={payment1}
            onChange={(e) => setPayment1(e.target.value !== '' ? Number(e.target.value) : '')}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">{settings.currencySymbol}</InputAdornment>,
              }
            }}
          />
          <TextField
            fullWidth
            label={`2nd Payment Due (${settings.currencySymbol})`}
            type="number"
            placeholder="Scheduled second installment"
            value={payment2}
            onChange={(e) => setPayment2(e.target.value !== '' ? Number(e.target.value) : '')}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">{settings.currencySymbol}</InputAdornment>,
              }
            }}
          />
        </div>
      </Box>

      {/* =========================================
          SECTION 5: PACKAGE INCLUDED
          ========================================= */}
      <Box className="p-4 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-2">
          <CheckSquare className="w-4 h-4 text-[#D4AF37]" />
          <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
            Section 5: Package Included
          </Typography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Photography */}
          <Box className="space-y-4">
            <Typography variant="subtitle2" className="text-gray-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-gray-800 pb-1.5">
              📸 Photography Deliverables
            </Typography>

            <div className="space-y-3.5">
              {/* Album Item */}
              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 space-y-2.5">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgAlbum === 'Yes'}
                      onChange={(e) => setPkgAlbum(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-bold text-gray-300">Photo Album</span>}
                />
                {pkgAlbum === 'Yes' && (
                  <div className="grid grid-cols-2 gap-2 pl-7">
                    <TextField
                      size="small"
                      fullWidth
                      label="Album Size"
                      placeholder="e.g. 12x18"
                      value={pkgAlbumSize}
                      onChange={(e) => setPkgAlbumSize(e.target.value)}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Album Qty"
                      type="number"
                      placeholder="e.g. 1"
                      value={pkgAlbumQty}
                      onChange={(e) => setPkgAlbumQty(e.target.value !== '' ? Number(e.target.value) : '')}
                    />
                  </div>
                )}
              </Box>

              {/* Photo Frame Item */}
              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 space-y-2.5">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgFrame === 'Yes'}
                      onChange={(e) => setPkgFrame(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-bold text-gray-300">Laminated Wall Frame</span>}
                />
                {pkgFrame === 'Yes' && (
                  <div className="grid grid-cols-2 gap-2 pl-7">
                    <TextField
                      size="small"
                      fullWidth
                      label="Frame Size"
                      placeholder="e.g. 20x24"
                      value={pkgFrameSize}
                      onChange={(e) => setPkgFrameSize(e.target.value)}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Frame Qty"
                      type="number"
                      placeholder="e.g. 2"
                      value={pkgFrameQty}
                      onChange={(e) => setPkgFrameQty(e.target.value !== '' ? Number(e.target.value) : '')}
                    />
                  </div>
                )}
              </Box>

              {/* USB Pendrive & Edited photos */}
              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 space-y-2.5">
                <Typography className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 pl-1">
                  Media Delivery & Retouching
                </Typography>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <TextField
                    size="small"
                    fullWidth
                    label="USB Pendrive Size"
                    placeholder="e.g. 64GB"
                    value={pkgPendriveSize}
                    onChange={(e) => setPkgPendriveSize(e.target.value)}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="USB Pendrive Qty"
                    type="number"
                    placeholder="e.g. 1"
                    value={pkgPendriveQty}
                    onChange={(e) => setPkgPendriveQty(e.target.value !== '' ? Number(e.target.value) : '')}
                  />
                </div>
                <TextField
                  size="small"
                  fullWidth
                  label="Edited/Retouched Photos Count"
                  type="number"
                  placeholder="e.g. 250 Pics"
                  value={pkgEditedPhotosCount}
                  onChange={(e) => setPkgEditedPhotosCount(e.target.value !== '' ? Number(e.target.value) : '')}
                />
              </Box>
            </div>
          </Box>

          {/* Column 2: Videography */}
          <Box className="space-y-4">
            <Typography variant="subtitle2" className="text-gray-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-gray-800 pb-1.5">
              🎥 Videography Deliverables
            </Typography>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgStandardVideoEditing === 'Yes'}
                      onChange={(e) => setPkgStandardVideoEditing(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">Standard Video</span>}
                />
              </Box>

              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgCinematicVideoEditing === 'Yes'}
                      onChange={(e) => setPkgCinematicVideoEditing(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">Cinematic Video</span>}
                />
              </Box>

              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgRawVideo === 'Yes'}
                      onChange={(e) => setPkgRawVideo(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">Raw Video Footage</span>}
                />
              </Box>

              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgShortTrailer === 'Yes'}
                      onChange={(e) => setPkgShortTrailer(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">Short Teaser Trailer</span>}
                />
              </Box>

              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgDroneCoverage === 'Yes'}
                      onChange={(e) => setPkgDroneCoverage(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">Drone Coverage</span>}
                />
              </Box>

              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgLedWall === 'Yes'}
                      onChange={(e) => setPkgLedWall(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">LED Wall Display</span>}
                />
              </Box>

              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgCrane === 'Yes'}
                      onChange={(e) => setPkgCrane(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">Crane Jib Camera</span>}
                />
              </Box>

              <Box className="p-2.5 bg-black/20 rounded-lg border border-[#D4AF37]/5 flex items-center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pkgLiveStreaming === 'Yes'}
                      onChange={(e) => setPkgLiveStreaming(e.target.checked ? 'Yes' : 'No')}
                      size="small"
                      className="text-[#D4AF37]"
                    />
                  }
                  label={<span className="text-xs font-semibold text-gray-300">Live Streaming</span>}
                />
              </Box>
            </div>
          </Box>
        </div>
      </Box>

      {/* =========================================
          SECTION 6: TEAM ASSIGNMENT
          ========================================= */}
      <Box className="p-4 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-2">
          <Users className="w-4 h-4 text-[#D4AF37]" />
          <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
            Section 6: Team Assignment
          </Typography>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <TextField
            select
            fullWidth
            label="Lead Cinematographer"
            value={leadCinematographer}
            onChange={(e) => setLeadCinematographer(e.target.value)}
            required
          >
            {!settings.cinematographers || settings.cinematographers.length === 0 ? (
              <MenuItem disabled value="">
                <em>No cinematographers configured (Add in Brand Settings)</em>
              </MenuItem>
            ) : (
              settings.cinematographers.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))
            )}
          </TextField>
        </div>

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
        <Box className="border border-[#D4AF37]/25 rounded-xl p-3.5 bg-black/20 space-y-3.5">
          <div className="flex justify-between items-center border-b border-[#D4AF37]/15 pb-2">
            <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Event-Specific Outsource Assignments
            </Typography>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={handleAddAssignmentRow}
              className="text-[10px] h-6 py-0 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold uppercase tracking-wider px-2"
            >
              + Add Assignment
            </Button>
          </div>

          {freelancerAssignments.length === 0 ? (
            <div className="text-gray-500 text-[11px] py-3 text-center italic">
              No event-specific freelancer assignments added yet.
            </div>
          ) : (
            <Box className="space-y-3">
              {freelancerAssignments.map((assignment, index) => (
                <Box key={index} className="p-3 bg-black/40 rounded-xl border border-gray-900 space-y-3 relative">
                  <IconButton 
                    size="small" 
                    className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-300 p-1"
                    onClick={() => handleRemoveAssignmentRow(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Event Date (Automatic) */}
                    <TextField
                      size="small"
                      label="Date"
                      disabled
                      value={weddingDate ? formatDateToDDMMYYYY(weddingDate) : 'No date set'}
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

                  <div className="flex justify-end text-[10px] text-[#D4AF37] font-bold pr-1">
                    Total: {settings.currencySymbol}{assignment.perDayRate * assignment.workingDays}
                  </div>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* =========================================
          SECTION 7: AGREEMENT INFORMATION
          ========================================= */}
      <Box className="p-4 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-2">
          <FileSignature className="w-4 h-4 text-[#D4AF37]" />
          <Typography className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
            Section 7: Agreement Information
          </Typography>
        </div>

        <TextField
          fullWidth
          label="Special Log & Executive Notes"
          placeholder="Rehearsal dinner coverage, custom album requests, framing, lens configs..."
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Box className="space-y-1.5 pt-1">
          <Typography className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-1">
            Agreement Terms & Conditions (From Brand Settings)
          </Typography>
          <Box className="p-3 bg-black/40 rounded-lg border border-gray-900 max-h-32 overflow-y-auto text-xs text-gray-400 leading-relaxed font-serif whitespace-pre-wrap">
            {settings.invoiceTerms || '1. Retainer fee is non-refundable.\n2. Balance dues must be cleared on the final event date.\n3. Digital files will be delivered within 30-45 business days.'}
          </Box>
        </Box>
      </Box>
    </div>
  );
};
