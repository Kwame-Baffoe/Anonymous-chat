// components/Spinner.tsx

import { ClipLoader } from 'react-spinners';

interface SpinnerProps {
  size?: number;
  color?: string;
}

const Spinner = ({ size = 35, color = '#3B82F6' }: SpinnerProps) => (
  <div className="flex justify-center items-center">
    <ClipLoader size={size} color={color} />
  </div>
);

export default Spinner;
