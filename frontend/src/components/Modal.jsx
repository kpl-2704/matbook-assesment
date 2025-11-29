import React from 'react';

export default function Modal({open, onClose, title, children}) {
  if(!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="bg-white rounded shadow-lg p-4 max-w-xl w-full z-10">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
