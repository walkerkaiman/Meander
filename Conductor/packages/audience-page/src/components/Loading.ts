/**
 * Loading component for displaying loading states
 */
export class Loading {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show loading state
   */
  show(message: string = 'Connecting...'): void {
    this.container.innerHTML = '';
    this.container.className = 'loading';

    const loadingContainer = document.createElement('div');
    loadingContainer.innerHTML = `
      <div class="loading__spinner" role="status" aria-label="Loading"></div>
      <div class="loading__text">${message}</div>
    `;

    this.container.appendChild(loadingContainer);
  }

  /**
   * Hide loading state
   */
  hide(): void {
    this.container.innerHTML = '';
  }
}









