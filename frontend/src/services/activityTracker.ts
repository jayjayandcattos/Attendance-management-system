import api from '../api';

interface ActivityLog {
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, any>;
}

class ActivityTracker {
  private queue: ActivityLog[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_DELAY = 2000; // Send logs every 2 seconds
  private readonly MAX_QUEUE_SIZE = 10;

  constructor() {
    this.startFlushInterval();
    this.setupBeforeUnload();
  }

  /**
   * Track page navigation
   */
  trackPageView(pageName: string, pageUrl: string) {
    this.log({
      action: 'page_view',
      entityType: 'navigation',
      details: {
        page: pageName,
        url: pageUrl,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track button/action clicks
   */
  trackClick(elementName: string, elementType: string, additionalData?: Record<string, any>) {
    this.log({
      action: 'click',
      entityType: 'interaction',
      details: {
        element: elementName,
        type: elementType,
        ...additionalData,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track file/resource access
   */
  trackFileAccess(fileName: string, fileId: number, action: 'view' | 'download' | 'open') {
    this.log({
      action: `file_${action}`,
      entityType: 'file',
      entityId: fileId,
      details: {
        fileName,
        action,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track form submissions
   */
  trackFormSubmit(formName: string, formData?: Record<string, any>) {
    this.log({
      action: 'form_submit',
      entityType: 'form',
      details: {
        formName,
        ...formData,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track search queries
   */
  trackSearch(query: string, context: string) {
    this.log({
      action: 'search',
      entityType: 'search',
      details: {
        query,
        context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track modal/dialog opens
   */
  trackModalOpen(modalName: string, context?: string) {
    this.log({
      action: 'modal_open',
      entityType: 'interaction',
      details: {
        modalName,
        context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track tab/section changes
   */
  trackTabChange(tabName: string, context: string) {
    this.log({
      action: 'tab_change',
      entityType: 'interaction',
      details: {
        tabName,
        context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track filter/sort changes
   */
  trackFilterChange(filterType: string, filterValue: any, context: string) {
    this.log({
      action: 'filter_change',
      entityType: 'interaction',
      details: {
        filterType,
        filterValue,
        context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Add log to queue
   */
  private log(activity: ActivityLog) {
    this.queue.push(activity);
    
    // Flush immediately if queue is full
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Send queued logs to backend
   */
  private async flush() {
    if (this.queue.length === 0) return;

    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      await api.post('/api/activity/batch', { activities: logsToSend });
    } catch (error) {
      console.error('Failed to send activity logs:', error);
      // Don't retry to avoid infinite loops
    }
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_DELAY);
  }

  /**
   * Flush logs before page unload
   */
  private setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        const blob = new Blob([JSON.stringify({ activities: this.queue })], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/activity/batch', blob);
      }
    });
  }

  /**
   * Stop tracking and cleanup
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Export singleton instance
export const activityTracker = new ActivityTracker();
