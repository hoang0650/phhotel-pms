import { create } from 'zustand';

export interface GuestDraft {
  fullName?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  nationality?: string;
  address?: string;
  dateOfBirth?: string;
  idExpiryDate?: string;
  gender?: string;
}

interface GuestDraftState {
  draft: GuestDraft | null;
  setDraft: (d: GuestDraft | null) => void;
  clear: () => void;
}

export const useGuestDraftStore = create<GuestDraftState>((set) => ({
  draft: null,
  setDraft: (d) => set({ draft: d }),
  clear: () => set({ draft: null }),
}));
