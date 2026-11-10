"use client";
import { useState } from "react";
export function Avatar({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const safeImage = image?.startsWith("https://") ? image : null;
  return (
    <span className="avatar">
      {safeImage && !failed ? (
        <img
          src={safeImage}
          alt={`${name}’s profile photo`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={`${name}’s profile`}>
          {name.trim().charAt(0).toUpperCase() || "M"}
        </span>
      )}
    </span>
  );
}
