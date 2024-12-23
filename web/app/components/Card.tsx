import React, { ReactNode } from "react";

interface Card {
  children: ReactNode;
}

const Card: React.FC<Card> = ({ children }) => {
  return (
    <div className="w-full p-4 bg-neutral-800 text-white rounded-lg shadow-lg">
      {children}
    </div>
  );
};

export default Card;
