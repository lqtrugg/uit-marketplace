'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getErrorMessage,
  requestJson,
  uploadItemMediaFile
} from '@/app/_lib/clientApi';

const MAX_MEDIA_FILES = 12;
const HCM_DEFAULT_ZIP_CODE = '700000';
const CONDITION_OPTIONS = ['Like New', 'Good', 'Fair', 'Poor'];
const DELIVERY_OPTIONS = ['Shipping COD', 'Meetup'];

function normalizeVietnamese(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

function findWardFromAddressText(addressText, wards) {
  const normalizedAddress = normalizeVietnamese(addressText);

  if (!normalizedAddress || !Array.isArray(wards) || wards.length === 0) {
    return null;
  }

  const strictMatch = wards.find((ward) => {
    const wardName = normalizeVietnamese(ward.wardName);
    const districtName = normalizeVietnamese(ward.districtName);
    return wardName && districtName && normalizedAddress.includes(wardName) && normalizedAddress.includes(districtName);
  });

  if (strictMatch) {
    return strictMatch;
  }

  return (
    wards.find((ward) => {
      const wardName = normalizeVietnamese(ward.wardName);
      return wardName && normalizedAddress.includes(wardName);
    }) || null
  );
}

function extractFromWardLevel(addressText) {
  const value = String(addressText || '').trim();

  if (!value) {
    return '';
  }

  const lower = value.toLowerCase();
  const markers = ['phường', 'xã', 'đặc khu'];
  const markerIndexes = markers
    .map((marker) => lower.indexOf(marker))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  if (!markerIndexes.length) {
    return value;
  }

  const sliced = value.slice(markerIndexes[0]).trim();
  return sliced.replace(/\s*,\s*việt nam$/i, '').trim();
}

function ActionChip({ label, badge, glyph, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 text-left transition hover:border-white/35 hover:bg-white/10"
      aria-label={label}
    >
      <span className="grid size-8 place-content-center rounded-lg bg-white/10 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/90 transition group-hover:bg-white/20">
        {glyph}
      </span>
      <span className="hidden text-xs font-semibold text-white/85 xl:inline">{label}</span>
      {badge ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-clicon-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

const initialPostForm = {
  itemName: '',
  description: '',
  durationDays: '0',
  durationHours: '0',
  wardCode: '',
  reason: '',
  price: '',
  negotiable: 'Yes',
  condition: 'Good',
  delivery: 'Meetup'
};

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  const fractionDigits = size >= 10 || index === 0 ? 0 : 1;
  return `${size.toFixed(fractionDigits)} ${units[index]}`;
}

export default function MainNav() {
  const router = useRouter();
  const mediaInputRef = useRef(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [postForm, setPostForm] = useState(initialPostForm);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState([]);
  const [mediaInputKey, setMediaInputKey] = useState(0);
  const [postStatus, setPostStatus] = useState('');
  const [postStatusTone, setPostStatusTone] = useState('success');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [wardOptions, setWardOptions] = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [wardSearch, setWardSearch] = useState('');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locatingWard, setLocatingWard] = useState(false);
  const [locationHint, setLocationHint] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadWards() {
      setLoadingWards(true);

      try {
        const [sessionPayload, wardPayload] = await Promise.all([
          requestJson('/api/sessions/current').catch(() => ({ user: null })),
          requestJson('/api/locations/hcm/wards?limit=2000')
        ]);
        const wards = Array.isArray(wardPayload?.wards) ? wardPayload.wards : [];

        if (!ignore) {
          setCurrentUser(sessionPayload?.user || null);
          setWardOptions(wards);
        }
      } catch (error) {
        if (!ignore) {
          setPostStatusTone('error');
          setPostStatus(getErrorMessage(error, 'Failed to load HCM wards.'));
        }
      } finally {
        if (!ignore) {
          setLoadingWards(false);
        }
      }
    }

    loadWards();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!mediaFiles.length) {
      setMediaPreviewUrls([]);
      return;
    }

    const objectUrls = mediaFiles.map((file) => URL.createObjectURL(file));
    setMediaPreviewUrls(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mediaFiles]);

  const filteredWards = useMemo(() => {
    const keyword = normalizeVietnamese(wardSearch);
    const withPriority = (items) =>
      items.sort((a, b) => {
        const aName = normalizeVietnamese(a.wardName);
        const bName = normalizeVietnamese(b.wardName);
        const aStarts = keyword ? aName.startsWith(keyword) : false;
        const bStarts = keyword ? bName.startsWith(keyword) : false;

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }

        return aName.localeCompare(bName, 'vi');
      });

    if (!keyword) {
      return [...wardOptions].sort((a, b) =>
        normalizeVietnamese(a.wardName).localeCompare(normalizeVietnamese(b.wardName), 'vi')
      );
    }

    return withPriority(
      wardOptions
      .filter((ward) => {
        const wardName = normalizeVietnamese(ward.wardName);
        const districtName = normalizeVietnamese(ward.districtName);
        return wardName.includes(keyword) || districtName.includes(keyword);
      })
    );
  }, [wardOptions, wardSearch]);

  const selectedWard = useMemo(() => {
    const code = Number.parseInt(String(postForm.wardCode || ''), 10);

    if (!Number.isInteger(code) || code <= 0) {
      return null;
    }

    return wardOptions.find((ward) => ward.wardCode === code) || null;
  }, [postForm.wardCode, wardOptions]);

  function updatePostField(field, value) {
    setPostForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  function clearMediaSelection() {
    setMediaFiles([]);
    setMediaInputKey((previous) => previous + 1);
  }

  function openImagePicker() {
    mediaInputRef.current?.click();
  }

  function selectWard(ward) {
    if (!ward?.wardCode) {
      return;
    }

    updatePostField('wardCode', String(ward.wardCode));
    setWardSearch(`${ward.wardName} - ${ward.districtName}`);
    setLocationHint(`${ward.wardName}, ${ward.districtName}`);
    setIsLocationPickerOpen(false);
  }

  async function handleUseGpsLocation() {
    if (locatingWard) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPostStatusTone('error');
      setPostStatus('Trình duyệt không hỗ trợ GPS.');
      return;
    }

    setLocatingWard(true);
    setPostStatusTone('info');
    setPostStatus('Đang lấy vị trí GPS...');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const reverseUrl =
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=vi`;
          const response = await fetch(reverseUrl, {
            headers: {
              Accept: 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`Reverse geocoding failed with HTTP ${response.status}.`);
          }

          const payload = await response.json();
          const displayName = [payload?.display_name, payload?.name].filter(Boolean).join(' ');
          const trimmedAddress = extractFromWardLevel(displayName);
          const addressText = trimmedAddress || displayName;
          const matchedWard = findWardFromAddressText(addressText, wardOptions);

          if (matchedWard) {
            selectWard(matchedWard);
            setPostStatusTone('success');
            setPostStatus('Đã tự chọn location từ GPS.');
            return;
          }

          const addressLabel = trimmedAddress || displayName || '';
          setLocationHint(addressLabel);
          setWardSearch(addressLabel);
          setIsLocationPickerOpen(true);
          setPostStatusTone('error');
          setPostStatus('Không khớp chính xác phường/xã. Hãy chọn lại từ danh sách gợi ý.');
        } catch (error) {
          setPostStatusTone('error');
          setPostStatus(getErrorMessage(error, 'Không xác định được địa chỉ từ GPS.'));
        } finally {
          setLocatingWard(false);
        }
      },
      (error) => {
        const message =
          error?.code === 1
            ? 'Bạn đã từ chối quyền truy cập vị trí.'
            : 'Không thể lấy vị trí hiện tại.';
        setPostStatusTone('error');
        setPostStatus(message);
        setLocatingWard(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  function handleMediaSelection(event) {
    const nextFiles = Array.from(event.target.files || []);

    if (!nextFiles.length) {
      setMediaFiles([]);
      return;
    }

    if (nextFiles.length > MAX_MEDIA_FILES) {
      setPostStatusTone('error');
      setPostStatus(`You can upload at most ${MAX_MEDIA_FILES} files per post.`);
      setMediaFiles(nextFiles.slice(0, MAX_MEDIA_FILES));
      return;
    }

    setPostStatus('');
    setMediaFiles(nextFiles);
  }

  function resetPostFormState() {
    setPostForm(initialPostForm);
    setWardSearch('');
    setLocationHint('');
    setIsLocationPickerOpen(false);
    clearMediaSelection();
  }

  async function handlePostSubmit(event) {
    event.preventDefault();

    if (submittingPost) {
      return;
    }

    if (!postForm.wardCode) {
      setPostStatusTone('error');
      setPostStatus('Vui lòng chọn phường/xã.');
      setIsLocationPickerOpen(true);
      return;
    }

    setSubmittingPost(true);
    setPostStatusTone('info');
    setPostStatus('Posting item...');

    try {
      const imageUrls = [];
      const videoUrls = [];

      if (mediaFiles.length) {
        for (let index = 0; index < mediaFiles.length; index += 1) {
          const mediaFile = mediaFiles[index];
          setPostStatus(`Uploading media ${index + 1}/${mediaFiles.length}: ${mediaFile.name}`);
          const uploaded = await uploadItemMediaFile(mediaFile);
          const mediaType = (uploaded.contentType || mediaFile.type || '').toLowerCase();

          if (mediaType.startsWith('video/')) {
            videoUrls.push(uploaded.publicUrl);
          } else {
            imageUrls.push(uploaded.publicUrl);
          }
        }
      }

      setPostStatus('Creating item post...');
      const payload = await requestJson('/api/items', {
        method: 'POST',
        body: JSON.stringify({
          itemName: postForm.itemName,
          description: postForm.description,
          durationDays: postForm.durationDays,
          durationHours: postForm.durationHours,
          wardCode: postForm.wardCode,
          reason: postForm.reason,
          price: postForm.price,
          negotiable: postForm.negotiable,
          condition: postForm.condition,
          delivery: postForm.delivery,
          postToMarketplace: true,
          imageUrls,
          videoUrls
        })
      });

      const createdItemId = Number.parseInt(String(payload?.item?.id || ''), 10);
      resetPostFormState();
      setIsPostModalOpen(false);

      if (createdItemId > 0) {
        router.push(`/post/success?itemId=${createdItemId}`);
      } else {
        router.push('/post/success');
      }
    } catch (error) {
      setPostStatusTone('error');
      setPostStatus(getErrorMessage(error, 'Failed to post item.'));
    } finally {
      setSubmittingPost(false);
    }
  }

  function openPostModal() {
    setPostStatus('');
    setPostStatusTone('success');
    setIsPostModalOpen(true);
  }

  function closePostModal() {
    setIsPostModalOpen(false);
  }

  function openReservedPage() {
    router.push('/reserved');
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#1f2a3d] bg-[#0A1325] text-white shadow-card">
        <div className="py-4">
          <div className="app-container grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
            <Link href="/home" className="inline-flex items-center gap-3">
              <span className="grid size-11 place-content-center rounded-2xl bg-gradient-to-br from-clicon-warning to-clicon-primary text-sm font-black tracking-[0.2em] text-clicon-slate">
                UIT
              </span>
              <span className="text-2xl font-black uppercase tracking-[0.08em]">Market Pulse</span>
            </Link>

            <form action="/shop" method="get" role="search" className="flex items-center rounded-xl border border-white/15 bg-white/95 p-1.5 text-clicon-slate">
              <input
                type="search"
                name="q"
                placeholder="Search item, brand, or seller..."
                className="h-10 w-full border-0 bg-transparent px-3 text-sm outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-clicon-primary px-4 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-clicon-secondary"
              >
                Find
              </button>
            </form>

            <div className="flex items-center justify-end gap-2">
              <ActionChip label="Reserved" glyph="RSV" onClick={openReservedPage} />
              <ActionChip label="Post" glyph="PST" onClick={openPostModal} />

              <div className="group relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 transition hover:border-white/35 hover:bg-white/10"
                  aria-haspopup="menu"
                  aria-label="user account menu"
                >
                  <span className="grid size-8 place-content-center rounded-lg bg-white/10 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/90">
                    ID
                  </span>
                  <span className="hidden text-xs font-semibold text-white/85 xl:inline">Account</span>
                </button>

                <div className="invisible absolute right-0 top-full z-20 mt-2 w-52 translate-y-1 rounded-xl border border-clicon-border bg-white p-1.5 text-clicon-slate opacity-0 shadow-card transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <Link
                    href="/social-profile"
                    className="block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-clicon-surface"
                  >
                    Social Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-clicon-surface"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/settings/dashboard"
                    className="block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-clicon-surface"
                  >
                    Item Dashboard
                  </Link>
                  <Link
                    href="/reserved"
                    className="block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-clicon-surface"
                  >
                    Reserved Items
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {isPostModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-3 sm:p-8">
          <div className="w-full max-w-4xl rounded-[26px] bg-white shadow-card">
            <div className="relative border-b border-clicon-border px-5 py-5 sm:px-8">
              <h2 className="text-center text-4xl font-bold text-clicon-slate">Tạo bài viết</h2>
              <button
                type="button"
                onClick={closePostModal}
                className="absolute right-5 top-4 grid size-12 place-content-center rounded-full bg-clicon-surface text-3xl text-clicon-muted transition hover:bg-clicon-border"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form className="space-y-4 p-5 sm:p-8" onSubmit={handlePostSubmit}>
              <input
                key={mediaInputKey}
                ref={mediaInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaSelection}
                className="hidden"
              />

              <div className="flex items-center gap-3">
                <div className="grid size-14 place-content-center rounded-full bg-clicon-surface text-lg font-bold text-clicon-slate">
                  {(currentUser?.name || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-3xl font-semibold text-clicon-slate">{currentUser?.name || 'Bạn'}</p>
                  <p className="text-sm text-clicon-muted">{currentUser?.email || 'Đăng bài trong marketplace'}</p>
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Tiêu đề món đồ</span>
                <input
                  type="text"
                  value={postForm.itemName}
                  onChange={(event) => updatePostField('itemName', event.target.value)}
                  placeholder="Ví dụ: iPhone 13 128GB"
                  required
                  className="h-12 rounded-xl border border-clicon-border px-4 text-base text-clicon-slate outline-none focus:border-clicon-secondary"
                />
              </label>

              <textarea
                value={postForm.description}
                onChange={(event) => updatePostField('description', event.target.value)}
                rows={4}
                placeholder={`${currentUser?.name || 'Bạn'} ơi, bạn đang nghĩ gì thế?`}
                required
                className="w-full rounded-xl border border-clicon-border px-4 py-3 text-2xl text-clicon-slate outline-none focus:border-clicon-secondary"
              />

              {mediaFiles.length ? (
                <div className="rounded-2xl border border-clicon-border bg-clicon-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-clicon-slate">
                      {mediaFiles.length} file đã chọn
                    </p>
                    <button
                      type="button"
                      onClick={clearMediaSelection}
                      className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-clicon-muted hover:bg-clicon-border"
                    >
                      Xóa
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {mediaFiles.map((mediaFile, index) => {
                      const previewUrl = mediaPreviewUrls[index];
                      const isImage = (mediaFile.type || '').startsWith('image/');

                      return (
                        <div key={`${mediaFile.name}-${mediaFile.size}-${index}`} className="overflow-hidden rounded-xl border border-clicon-border bg-white">
                          {isImage && previewUrl ? (
                            <img src={previewUrl} alt={mediaFile.name} className="h-44 w-full object-cover" />
                          ) : (
                            <div className="grid h-44 place-content-center bg-clicon-surface text-center text-sm text-clicon-muted">
                              {mediaFile.name}
                            </div>
                          )}
                          <p className="px-3 py-2 text-xs text-clicon-muted">
                            {mediaFile.name} · {formatBytes(mediaFile.size)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="relative rounded-2xl border border-clicon-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-semibold text-clicon-slate">Thêm vào bài viết của bạn</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openImagePicker}
                      className="grid size-12 place-content-center rounded-full bg-green-50 text-green-600 transition hover:bg-green-100"
                      aria-label="Chọn ảnh"
                      title="Chọn ảnh/video"
                    >
                      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 4a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm9 10H5l3.5-4.5 2.5 3 3.5-4.5L19 17z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLocationPickerOpen((previous) => !previous)}
                      className="grid size-12 place-content-center rounded-full bg-orange-50 text-orange-500 transition hover:bg-orange-100"
                      aria-label="Chọn location"
                      title="Chọn location"
                    >
                      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor">
                        <path d="M12 2a7 7 0 00-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isLocationPickerOpen ? (
                  <div className="absolute right-4 top-[calc(100%+10px)] z-20 w-full max-w-xl rounded-2xl border border-white/15 bg-[#1f1f1f] p-3 text-white shadow-2xl">
                    <input
                      type="text"
                      value={wardSearch}
                      onChange={(event) => setWardSearch(event.target.value)}
                      placeholder="Tìm phường/xã sau sáp nhập..."
                      className="mb-3 h-11 w-full rounded-xl border border-[#3b82f6] bg-[#2a2a2a] px-3 text-base text-white outline-none placeholder:text-gray-400"
                    />

                    <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                      <button
                        type="button"
                        onClick={handleUseGpsLocation}
                        disabled={locatingWard}
                        className="rounded-lg bg-clicon-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clicon-secondary disabled:opacity-60"
                      >
                        {locatingWard ? 'Đang lấy GPS...' : 'Dùng GPS'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsLocationPickerOpen(false)}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"
                      >
                        Đóng
                      </button>
                    </div>

                    {locationHint ? (
                      <p className="mb-2 text-xs text-gray-300">GPS: {locationHint}</p>
                    ) : null}

                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Kết quả location</p>

                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                      {loadingWards ? (
                        <p className="px-2 py-1 text-sm text-gray-300">Đang tải danh sách phường/xã...</p>
                      ) : filteredWards.length ? (
                        filteredWards.map((ward) => (
                          <button
                            key={ward.wardCode}
                            type="button"
                            onClick={() => selectWard(ward)}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/95 transition hover:bg-white/10"
                          >
                            <span className="font-medium">{ward.wardName}</span>
                            <span className="ml-2 text-xs text-gray-400">
                              {ward.wardDivisionType} · TP.HCM (sau sáp nhập)
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-2 py-1 text-sm text-gray-300">Không tìm thấy phường/xã phù hợp.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {selectedWard ? (
                <div className="rounded-xl border border-clicon-border bg-clicon-surface px-4 py-3 text-sm text-clicon-slate">
                  Location: <strong>{selectedWard.wardName}</strong> ({selectedWard.wardDivisionType}) · Zip {HCM_DEFAULT_ZIP_CODE}
                </div>
              ) : null}

              <div className="grid gap-3 rounded-2xl border border-clicon-border bg-clicon-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Giá</span>
                  <input
                    type="text"
                    value={postForm.price}
                    onChange={(event) => updatePostField('price', event.target.value)}
                    placeholder="Ví dụ: 3.500.000"
                    required
                    className="h-10 rounded-lg border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Ngày</span>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={postForm.durationDays}
                    onChange={(event) => updatePostField('durationDays', event.target.value)}
                    className="h-10 rounded-lg border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Giờ</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={postForm.durationHours}
                    onChange={(event) => updatePostField('durationHours', event.target.value)}
                    className="h-10 rounded-lg border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Condition</span>
                  <select
                    value={postForm.condition}
                    onChange={(event) => updatePostField('condition', event.target.value)}
                    className="h-10 rounded-lg border border-clicon-border bg-white px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  >
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Delivery</span>
                  <select
                    value={postForm.delivery}
                    onChange={(event) => updatePostField('delivery', event.target.value)}
                    className="h-10 rounded-lg border border-clicon-border bg-white px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  >
                    {DELIVERY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Negotiable</span>
                  <select
                    value={postForm.negotiable}
                    onChange={(event) => updatePostField('negotiable', event.target.value)}
                    className="h-10 rounded-lg border border-clicon-border bg-white px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  >
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </label>

                <label className="grid gap-1 sm:col-span-2 lg:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Lý do bán</span>
                  <input
                    type="text"
                    value={postForm.reason}
                    onChange={(event) => updatePostField('reason', event.target.value)}
                    placeholder="Ví dụ: Không còn nhu cầu sử dụng"
                    required
                    className="h-10 rounded-lg border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  />
                </label>
              </div>

              {postStatus ? <p className={`status status-${postStatusTone}`}>{postStatus}</p> : null}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-clicon-primary px-5 text-xl font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
                >
                  {submittingPost ? 'Đang đăng...' : 'Đăng'}
                </button>
                <button
                  type="button"
                  onClick={resetPostFormState}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-clicon-border px-5 text-sm font-medium text-clicon-muted transition hover:bg-clicon-surface"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
