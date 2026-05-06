import { useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';

interface NotFoundProps {
  labels: string[];
}

const ChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export function NotFound({ labels }: NotFoundProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (labels.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200">
      <CardBody className="p-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium text-red-700">
            No encontradas ({labels.length})
          </span>
          {isOpen ? <ChevronDown /> : <ChevronRight />}
        </button>
        {isOpen && (
          <ul className="mt-2 pl-4 list-disc text-sm text-gray-600">
            {labels.map((label, idx) => (
              <li key={idx}>{label}</li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}