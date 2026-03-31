import React from "react";
import { passwordStrength } from "../utils/validation";

const PasswordStrength = ({ password = "" }) => {
  const { score, label, color } = passwordStrength(password);
  // We render 5 segments; highlight segments based on score (score 0..4)
  return (
    <div className="mt-2">
      <div className="flex gap-1 h-2 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded ${i <= score ? color : "bg-slate-700/40"}`}
          />
        ))}
      </div>
      <div className="text-xs text-slate-300">{label}</div>
    </div>
  );
};

export default PasswordStrength;
