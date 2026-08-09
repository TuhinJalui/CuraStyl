/**
 * AI Assistant Analytics
 * Track usage, performance, and user engagement
 */

export interface AIAnalyticsEvent {
  event: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class AIAnalytics {
  private events: AIAnalyticsEvent[] = [];
  private sessionStart: Date;

  constructor() {
    this.sessionStart = new Date();
  }

  /**
   * Track a chat message sent
   */
  trackMessageSent(type: "text" | "voice" | "image", messageLength: number) {
    this.track("message_sent", {
      inputType: type,
      messageLength,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track AI response received
   */
  trackResponseReceived(
    responseTime: number,
    tokenCount: number,
    wasStreamed: boolean
  ) {
    this.track("response_received", {
      responseTime,
      tokenCount,
      wasStreamed,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track voice input usage
   */
  trackVoiceInput(duration: number, success: boolean) {
    this.track("voice_input", {
      duration,
      success,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track image upload and analysis
   */
  trackImageAnalysis(
    fileSize: number,
    mimeType: string,
    analysisTime: number,
    success: boolean
  ) {
    this.track("image_analysis", {
      fileSize,
      mimeType,
      analysisTime,
      success,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track personality mode change
   */
  trackPersonalityChange(from: string, to: string) {
    this.track("personality_change", {
      from,
      to,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track suggested action clicked
   */
  trackActionClicked(action: string, context: string) {
    this.track("action_clicked", {
      action,
      context,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track conversation export
   */
  trackConversationExport(messageCount: number) {
    this.track("conversation_exported", {
      messageCount,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track error occurrence
   */
  trackError(errorType: string, errorMessage: string) {
    this.track("error", {
      errorType,
      errorMessage,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: "share" | "copy" | "speak" | "clear") {
    this.track("engagement", {
      action,
      sessionDuration: this.getSessionDuration(),
    });
  }

  /**
   * Get session duration in seconds
   */
  private getSessionDuration(): number {
    return Math.floor((new Date().getTime() - this.sessionStart.getTime()) / 1000);
  }

  /**
   * Track generic event
   */
  private track(event: string, metadata?: Record<string, any>) {
    const analyticsEvent: AIAnalyticsEvent = {
      event,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        sessionId: this.getSessionId(),
      },
    };

    this.events.push(analyticsEvent);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("[AI Analytics]", analyticsEvent);
    }

    // Send to analytics service (implement as needed)
    this.sendToAnalytics(analyticsEvent);
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    if (typeof window === "undefined") return "server";

    let sessionId = sessionStorage.getItem("ai_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("ai_session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * Send event to analytics service
   */
  private async sendToAnalytics(event: AIAnalyticsEvent) {
    try {
      // Implement your analytics service here
      // Examples: Google Analytics, Mixpanel, Amplitude, custom backend
      
      // For now, just store in localStorage for demo
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("ai_analytics");
        const events = stored ? JSON.parse(stored) : [];
        events.push(event);
        
        // Keep only last 100 events
        if (events.length > 100) {
          events.shift();
        }
        
        localStorage.setItem("ai_analytics", JSON.stringify(events));
      }
    } catch (error) {
      console.error("Failed to send analytics:", error);
    }
  }

  /**
   * Get all events
   */
  getEvents(): AIAnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events summary
   */
  getSummary() {
    const totalMessages = this.events.filter(e => e.event === "message_sent").length;
    const totalResponses = this.events.filter(e => e.event === "response_received").length;
    const voiceUsage = this.events.filter(e => e.event === "voice_input").length;
    const imageUploads = this.events.filter(e => e.event === "image_analysis").length;
    const errors = this.events.filter(e => e.event === "error").length;
    const avgResponseTime = this.getAverageResponseTime();

    return {
      totalMessages,
      totalResponses,
      voiceUsage,
      imageUploads,
      errors,
      avgResponseTime,
      sessionDuration: this.getSessionDuration(),
      sessionStart: this.sessionStart,
    };
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    const responseTimes = this.events
      .filter(e => e.event === "response_received")
      .map(e => e.metadata?.responseTime || 0)
      .filter(t => t > 0);

    if (responseTimes.length === 0) return 0;

    const sum = responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / responseTimes.length);
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
    this.sessionStart = new Date();
  }
}

// Export singleton instance
export const aiAnalytics = new AIAnalytics();

/**
 * React hook for AI analytics
 */
export function useAIAnalytics() {
  return {
    trackMessageSent: aiAnalytics.trackMessageSent.bind(aiAnalytics),
    trackResponseReceived: aiAnalytics.trackResponseReceived.bind(aiAnalytics),
    trackVoiceInput: aiAnalytics.trackVoiceInput.bind(aiAnalytics),
    trackImageAnalysis: aiAnalytics.trackImageAnalysis.bind(aiAnalytics),
    trackPersonalityChange: aiAnalytics.trackPersonalityChange.bind(aiAnalytics),
    trackActionClicked: aiAnalytics.trackActionClicked.bind(aiAnalytics),
    trackConversationExport: aiAnalytics.trackConversationExport.bind(aiAnalytics),
    trackError: aiAnalytics.trackError.bind(aiAnalytics),
    trackEngagement: aiAnalytics.trackEngagement.bind(aiAnalytics),
    getSummary: aiAnalytics.getSummary.bind(aiAnalytics),
  };
}
