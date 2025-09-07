/**
 * Error component for displaying error states
 */
export class ErrorDisplay {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show error state
   */
  show(title: string = 'Connection Error', message: string = 'Unable to connect to the show. Please check your connection and try again.'): void {
    this.container.innerHTML = '';
    this.container.className = 'error';

    const errorContainer = document.createElement('div');
    errorContainer.innerHTML = `
      <div class="error__title">${title}</div>
      <div class="error__message">${message}</div>
    `;

    this.container.appendChild(errorContainer);
  }

  /**
   * Hide error state
   */
  hide(): void {
    this.container.innerHTML = '';
  }
}

