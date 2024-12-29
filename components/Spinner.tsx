import React from 'react';

const Spinner: React.FC = () => (
  <div className="flex justify-center items-center" role="status">
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

export default Spinner;
