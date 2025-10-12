import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UserAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function UserAccessModal({ isOpen, onClose, userId, userName }: UserAccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Access Management: {userName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Current Access</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                This user's access is managed through their role and any specific permissions granted.
                Use the Content Management section to grant specific content access.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <div className="font-medium text-sm">Grant Content Access</div>
                <div className="text-xs text-gray-500">Give access to specific content</div>
              </button>
              <button className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <div className="font-medium text-sm">Add to Group</div>
                <div className="text-xs text-gray-500">Add to a user group</div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
