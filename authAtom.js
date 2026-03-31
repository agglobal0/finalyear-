import { atom } from "recoil";

export const authAtom = atom({
    key: "authAtom",
    default: {
        user: null,
        isAuthenticated: false,
        loading: true,
    },
});
