/**
 * EXAMPLE: How to implement activity tracking in your components
 * 
 * This file shows various ways to track user activities for security auditing.
 * Copy these patterns into your actual components.
 */

import React, { useState } from 'react';
import {
  usePageTracking,
  useClickTracking,
  useFileTracking,
  useFormTracking,
  useModalTracking,
  useSearchTracking
} from '../hooks/useActivityTracking';

const ActivityTrackingExample: React.FC = () => {
  // 1. TRACK PAGE VIEWS - Automatically tracks when component mounts
  usePageTracking('Dashboard');

  // 2. TRACK CLICKS
  const { trackClick } = useClickTracking();

  const handleButtonClick = () => {
    trackClick('Create Course Button', 'button', { section: 'dashboard' });
    // ... your actual button logic
  };

  const handleMenuItemClick = (menuItem: string) => {
    trackClick(`Menu: ${menuItem}`, 'menu-item');
    // ... navigation logic
  };

  // 3. TRACK FILE ACCESS
  const { trackFileView, trackFileDownload, trackFileOpen } = useFileTracking();

  const handleFileView = (file: any) => {
    trackFileView(file.name, file.id);
    // ... open file viewer
  };

  const handleFileDownload = (file: any) => {
    trackFileDownload(file.name, file.id);
    // ... download file
  };

  // 4. TRACK FORM SUBMISSIONS
  const { trackFormSubmit } = useFormTracking();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackFormSubmit('Create Course Form', {
      courseCode: 'CS101',
      // Don't include sensitive data like passwords!
    });
    // ... submit form
  };

  // 5. TRACK SEARCH
  const { trackSearch } = useSearchTracking();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    trackSearch(query, 'course-search');
    // ... perform search
  };

  // 6. TRACK MODAL OPENS
  const { trackModalOpen } = useModalTracking();
  const [showModal, setShowModal] = useState(false);

  const openModal = () => {
    trackModalOpen('Create Course Modal', 'dashboard');
    setShowModal(true);
  };

  return (
    <div>
      <h1>Activity Tracking Examples</h1>

      {/* Example 1: Track button clicks */}
      <button onClick={handleButtonClick}>
        Create Course (Tracked)
      </button>

      {/* Example 2: Track menu navigation */}
      <nav>
        <button onClick={() => handleMenuItemClick('Courses')}>Courses</button>
        <button onClick={() => handleMenuItemClick('Students')}>Students</button>
      </nav>

      {/* Example 3: Track file access */}
      <div>
        <button onClick={() => handleFileView({ id: 1, name: 'syllabus.pdf' })}>
          View File (Tracked)
        </button>
        <button onClick={() => handleFileDownload({ id: 1, name: 'syllabus.pdf' })}>
          Download File (Tracked)
        </button>
      </div>

      {/* Example 4: Track form submission */}
      <form onSubmit={handleFormSubmit}>
        <input type="text" placeholder="Course Name" />
        <button type="submit">Submit (Tracked)</button>
      </form>

      {/* Example 5: Track search */}
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search courses (Tracked)"
      />

      {/* Example 6: Track modal opens */}
      <button onClick={openModal}>
        Open Modal (Tracked)
      </button>
    </div>
  );
};

export default ActivityTrackingExample;

/**
 * QUICK INTEGRATION GUIDE:
 * 
 * 1. Add to any page component:
 *    usePageTracking('Page Name');
 * 
 * 2. Track important button clicks:
 *    const { trackClick } = useClickTracking();
 *    onClick={() => trackClick('Button Name', 'button')}
 * 
 * 3. Track file access:
 *    const { trackFileView } = useFileTracking();
 *    onClick={() => trackFileView(fileName, fileId)}
 * 
 * 4. Track form submissions:
 *    const { trackFormSubmit } = useFormTracking();
 *    onSubmit={() => trackFormSubmit('Form Name')}
 * 
 * 5. Track search:
 *    const { trackSearch } = useSearchTracking();
 *    onChange={() => trackSearch(query, 'context')}
 */
