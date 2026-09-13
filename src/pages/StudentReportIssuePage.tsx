import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { CategoryItem, ServiceItem } from '../types';
import {
  Camera,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileText,
  Loader2,
  HelpCircle,
  Building,
  Wrench,
} from 'lucide-react';

export const StudentReportIssuePage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('Electrical');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [location, setLocation] = useState('CSE Block');
  const [room, setRoom] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [createdIssueId, setCreatedIssueId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fallbackCategories = [
    'Electrical',
    'Furniture',
    'AC & Cooling',
    'Plumbing',
    'Cleanliness',
    'Wi-Fi / Network',
    'Laboratory',
    'Safety',
    'Infrastructure',
    'Other',
  ];

  const locations = [
    'Academic Block',
    'CSE Block',
    'Computer Lab',
    'Library',
    'Seminar Hall',
    'Canteen',
    'Washroom',
    'Parking Area',
    'Classroom',
    'Corridor',
    'Hostel Block',
    'Sports Complex',
    'Other',
  ];

  // Fetch real categories and services from the database
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoadingMetadata(true);
        const [cats, svcs] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getServices().catch(() => []),
        ]);
        if (mounted) {
          if (cats.length > 0) {
            setCategoriesList(cats);
            setSelectedCategoryName(cats[0].name);
            setSelectedCategoryId(cats[0].id);
          }
          if (svcs.length > 0) {
            setServicesList(svcs);
          }
        }
      } finally {
        if (mounted) setLoadingMetadata(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCategoryName(val);
    const cat = categoriesList.find((c) => c.name === val);
    setSelectedCategoryId(cat ? cat.id : '');
    // Reset service if it belongs to different category
    setSelectedServiceId('');
  };

  // Filter services matching chosen category
  const filteredServices = servicesList.filter((s) => {
    if (!selectedCategoryId) return true;
    return !s.categoryId || s.categoryId === selectedCategoryId;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      error('Invalid file format. Only JPG, PNG, and WEBP images are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error('Image size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageBase64(base64);
      setImagePreview(base64);
      setImageFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    setImageFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length < 5 || title.trim().length > 120) {
      error('Title must be between 5 and 120 characters.');
      return;
    }

    if (!room.trim()) {
      error('Please specify the room number or location spot.');
      return;
    }

    if (description.trim().length < 10 || description.trim().length > 1000) {
      error('Description must be between 10 and 1000 characters.');
      return;
    }

    try {
      setLoading(true);
      let uploadedUrl: string | undefined = undefined;

      if (imageBase64) {
        setUploadingImage(true);
        const uploadRes = await api.uploadImage({
          imageBase64,
          filename: imageFileName || 'evidence.jpg',
        });
        uploadedUrl = uploadRes.url;
      }

      const res = await api.createIssue({
        title: title.trim(),
        category: selectedCategoryName,
        categoryId: selectedCategoryId || undefined,
        serviceId: selectedServiceId || undefined,
        location,
        room: room.trim(),
        priority,
        description: description.trim(),
        imageUrl: uploadedUrl,
      });

      setCreatedIssueId(res.id);
      success(`Report filed successfully with tracking ID: ${res.id}`);
    } catch (err: any) {
      error(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setLocation('CSE Block');
    setRoom('');
    setPriority('Medium');
    setDescription('');
    handleRemoveImage();
    setCreatedIssueId(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Report a Campus Issue
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Submit facilities issues to campus operations for rapid dispatch and resolution.
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Issue Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">5–120 characters</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken ceiling projector in lecture hall"
              minLength={5}
              maxLength={120}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 dark:text-white"
            />
          </div>

          {/* Category & Specific Service */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCategoryName}
                onChange={handleCategoryChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 dark:text-white"
              >
                {categoriesList.length > 0
                  ? categoriesList.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  : fallbackCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Campus Service
                </label>
                <span className="text-[10px] text-slate-400">Optional</span>
              </div>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 dark:text-white"
              >
                <option value="">-- Select Specific Service (Optional) --</option>
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.slaHours ? `(${s.slaHours}h target)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Campus Block / Zone <span className="text-rose-500">*</span>
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 dark:text-white"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Room / Specific Spot <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. CSE-204, 2nd Floor Near Labs"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Priority Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Priority Level <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  priority === 'Low'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    LOW
                  </span>
                  <input
                    type="radio"
                    name="priority"
                    value="Low"
                    checked={priority === 'Low'}
                    onChange={() => setPriority('Low')}
                    className="accent-blue-600"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Minor issue; regular activities can proceed safely.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  priority === 'Medium'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    MEDIUM
                  </span>
                  <input
                    type="radio"
                    name="priority"
                    value="Medium"
                    checked={priority === 'Medium'}
                    onChange={() => setPriority('Medium')}
                    className="accent-amber-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Moderate disruption; affects everyday usage of the facility.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  priority === 'High'
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    HIGH
                  </span>
                  <input
                    type="radio"
                    name="priority"
                    value="High"
                    checked={priority === 'High'}
                    onChange={() => setPriority('High')}
                    className="accent-rose-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Critical stoppage or safety hazard requiring immediate dispatch.
                </p>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {description.length}/1000 characters
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the exact location, visual symptoms, and impact on campus activities..."
              rows={4}
              minLength={10}
              maxLength={1000}
              required
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 dark:text-white"
            />
          </div>

          {/* Photographic Evidence Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Photo Evidence
              </label>
              <span className="text-[11px] text-slate-400">Optional • Max 5MB (JPG, PNG, WEBP)</span>
            </div>

            {!imagePreview ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-[#ff3b00] dark:hover:border-[#ff3b00] transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-800/20"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Camera className="w-6 h-6 text-[#ff3b00]" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to browse photo or drag and drop here
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Photos significantly speed up repair verification.
                </p>
              </div>
            ) : (
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800 p-2">
                <img
                  src={imagePreview}
                  alt="Evidence preview"
                  className="w-full max-h-60 object-contain rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#ff3b00]" />
                  <span>{uploadingImage ? 'Securing Photo Evidence...' : 'Submitting to Database...'}</span>
                </>
              ) : (
                <>
                  <span>Submit Campus Report</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {createdIssueId && (
        <Modal
          isOpen={true}
          onClose={() => {
            resetForm();
            navigate(`/student/issues/${createdIssueId}`);
          }}
          title="Campus Issue Logged Successfully"
        >
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your report has been assigned unique identifier:
              </p>
              <p className="mt-1 font-mono font-bold text-lg text-slate-900 dark:text-white">
                {createdIssueId}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Facilities staff will review the priority and dispatch service crews. You will receive notifications as the status changes.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  navigate('/student/issues');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                View My Reports
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  navigate(`/student/issues/${createdIssueId}`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Track Status
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
