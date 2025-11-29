import React from 'react';

export default function Button({children, className='', ...props}){
  return (
    <button className={'px-4 py-2 rounded shadow-sm bg-blue-600 text-white ' + className} {...props}>
      {children}
    </button>
  );
}
