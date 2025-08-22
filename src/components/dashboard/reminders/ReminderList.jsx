import React from 'react';
import ReminderItem from './ReminderItem';

export default function ReminderList({ title, items, onHandle, onEdit }) {
  // Safety check for items - default to empty array if undefined
  if (!items || items.length === 0) {
    return null; // Don't render if no items
  }

  return (
    <div>
      <h3 className="text-md font-semibold text-center text-[var(--heading-color)] mb-3">{title}</h3>
      <div className="space-y-3">
        {items.map(item => (
          <ReminderItem key={item.id} item={item} onHandle={onHandle} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}