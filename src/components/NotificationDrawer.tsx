import React from 'react';
import { X, Bell, CheckCircle2, Clock, Truck, Trash2 } from 'lucide-react';
import { CustomerNotification } from '../types';

interface NotificationDrawerProps {
  notifications: CustomerNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  onClose,
  onMarkRead,
  onDeleteNotification,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-extrabold text-slate-900">Notifications</h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400">No notifications at this time.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => onMarkRead(n.id)}
                className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-colors relative group ${
                  n.read ? 'bg-slate-50 border-slate-100' : 'bg-blue-50/70 border-blue-200 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-slate-900 leading-snug flex-1">{n.title}</div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(n.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 -mt-0.5 -mr-0.5"
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">{n.message}</div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                  <span className="font-medium">{n.read ? 'Read' : 'New'}</span>
                  <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
