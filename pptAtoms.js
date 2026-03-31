import { atom } from 'recoil';

export const pptListAtom = atom({
  key: 'pptListAtom',
  default: [],
});

export const currentPPTAtom = atom({
  key: 'currentPPTAtom',
  default: null,
});

export const pptLoadingAtom = atom({
  key: 'pptLoadingAtom',
  default: { stage: '', active: false },
});

export const pptSearchQueryAtom = atom({
  key: 'pptSearchQueryAtom',
  default: '',
});

export const selectedSlideIndexAtom = atom({
  key: 'selectedSlideIndexAtom',
  default: 0,
});
