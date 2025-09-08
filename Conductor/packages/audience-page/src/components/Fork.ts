import { ForkNode } from '../types/conductor-types';
import { Choice } from '../types';
import { EventEmitter } from '../core/EventEmitter';
import { DeviceManager } from '../core/DeviceManager';

/**
 * Fork component for displaying voting interface
 */
export class Fork extends EventEmitter<{
  choice_selected: number;
  countdown_complete: void;
}> {
  private container: HTMLElement;
  private deviceManager: DeviceManager;
  private timerElement: HTMLElement | null = null;
  private choicesContainer: HTMLElement | null = null;
  private choices: Choice[] = [];
  private selectedIndex: number | null = null;
  private isLocked = false;
  private isVoting = false;

  constructor(container: HTMLElement) {
    super();
    this.container = container;
    this.deviceManager = DeviceManager.getInstance();
  }

  /**
   * Render fork with choices and timer
   */
  render(node: ForkNode, countdown: number | null = null, isVoting: boolean = false): void {

    this.container.innerHTML = '';
    this.container.className = 'fork';
    this.isVoting = isVoting;

    // Extract choices from node
    this.choices = node.choices.map((choice, index) => ({
      index,
      label: choice.label,
      nextStateId: choice.nextStateId
    }));

    // Create timer
    this.createTimer(countdown);

    // Create choices
    this.createChoices();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Update countdown timer
   */
  updateCountdown(seconds: number): void {
    if (this.timerElement) {
      this.timerElement.textContent = this.formatCountdown(seconds);
    }

    if (seconds === 0 && !this.isLocked) {
      this.lockInterface();
      this.emit('countdown_complete');
    }
  }

  /**
   * Update selected choice
   */
  updateSelection(choiceIndex: number | null): void {
    this.selectedIndex = choiceIndex;
    this.updateChoiceStyles();
  }

  /**
   * Update voting state
   */
  updateVotingState(isVoting: boolean): void {
    this.isVoting = isVoting;
    this.updateChoiceStyles();
  }

  /**
   * Lock interface when voting ends
   */
  lockInterface(): void {
    this.isLocked = true;
    
    if (this.choicesContainer) {
      const buttons = this.choicesContainer.querySelectorAll('.fork__choice');
      buttons.forEach(button => {
        button.classList.add('fork__choice--disabled');
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.container.innerHTML = '';
    this.timerElement = null;
    this.choicesContainer = null;
    this.choices = [];
    this.selectedIndex = null;
    this.isLocked = false;
  }

  private createTimer(countdown: number | null): void {
    this.timerElement = document.createElement('div');
    this.timerElement.className = 'fork__timer';
    this.timerElement.setAttribute('role', 'timer');
    this.timerElement.setAttribute('aria-live', 'assertive');
    this.timerElement.textContent = this.formatCountdown(countdown);
    
    this.container.appendChild(this.timerElement);
  }

  private createChoices(): void {
    this.choicesContainer = document.createElement('div');
    this.choicesContainer.className = 'fork__choices';
    this.choicesContainer.setAttribute('role', 'radiogroup');
    this.choicesContainer.setAttribute('aria-label', 'Vote for your choice');

    this.choices.forEach(choice => {
      const button = this.createChoiceButton(choice);
      this.choicesContainer!.appendChild(button);
    });

    this.container.appendChild(this.choicesContainer);
  }

  private createChoiceButton(choice: Choice): HTMLElement {
    const button = document.createElement('button');
    button.className = 'fork__choice';
    button.setAttribute('data-index', choice.index.toString());
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('aria-labelledby', `choice-${choice.index}`);
    button.textContent = choice.label;

    // Add label element for better accessibility
    const label = document.createElement('span');
    label.id = `choice-${choice.index}`;
    label.className = 'sr-only';
    label.textContent = `Option ${choice.index + 1}: ${choice.label}`;
    button.appendChild(label);

    return button;
  }

  private setupEventListeners(): void {
    if (!this.choicesContainer) return;

    // Delegated event handling
    this.choicesContainer.addEventListener('click', (event) => {
      this.handleChoiceClick(event);
    });

    // Keyboard navigation
    this.choicesContainer.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });
  }

  private handleChoiceClick(event: Event): void {
    if (this.isLocked || !this.isVoting) return;

    const target = event.target as HTMLElement;
    if (!target.classList.contains('fork__choice')) return;

    const indexStr = target.getAttribute('data-index');
    if (indexStr === null) return;

    const index = parseInt(indexStr, 10);
    this.selectChoice(index);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isLocked || !this.isVoting) return;

    const target = event.target as HTMLElement;
    if (!target.classList.contains('fork__choice')) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        const indexStr = target.getAttribute('data-index');
        if (indexStr !== null) {
          const index = parseInt(indexStr, 10);
          this.selectChoice(index);
        }
        break;
        
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.navigateToPreviousChoice();
        break;
        
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.navigateToNextChoice();
        break;
    }
  }

  private selectChoice(index: number): void {
    if (this.isLocked || index < 0 || index >= this.choices.length) {
      return;
    }

    this.selectedIndex = index;
    this.updateChoiceStyles();
    this.emit('choice_selected', index);

    // Haptic feedback
    this.deviceManager.vibrate(50);
  }

  private updateChoiceStyles(): void {
    if (!this.choicesContainer) return;

    const buttons = this.choicesContainer.querySelectorAll('.fork__choice');
    buttons.forEach((button, index) => {
      const isSelected = index === this.selectedIndex;
      const isDisabled = this.isLocked || !this.isVoting;

      // Update selection state
      if (isSelected) {
        button.classList.add('fork__choice--selected');
        button.setAttribute('aria-checked', 'true');
      } else {
        button.classList.remove('fork__choice--selected');
        button.setAttribute('aria-checked', 'false');
      }

      // Update disabled state
      if (isDisabled) {
        button.classList.add('fork__choice--disabled');
        button.setAttribute('disabled', 'true');
      } else {
        button.classList.remove('fork__choice--disabled');
        button.removeAttribute('disabled');
      }
    });
  }

  private navigateToPreviousChoice(): void {
    const buttons = Array.from(this.choicesContainer?.querySelectorAll('.fork__choice') || []);
    const currentIndex = buttons.findIndex(button => button === document.activeElement);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
    
    (buttons[previousIndex] as HTMLElement)?.focus();
  }

  private navigateToNextChoice(): void {
    const buttons = Array.from(this.choicesContainer?.querySelectorAll('.fork__choice') || []);
    const currentIndex = buttons.findIndex(button => button === document.activeElement);
    const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
    
    (buttons[nextIndex] as HTMLElement)?.focus();
  }

  private formatCountdown(seconds: number | null): string {
    if (seconds === null || seconds < 0) {
      return '';
    }
    
    // Format as SS (e.g., "05", "04", etc.)
    return seconds.toString().padStart(2, '0');
  }
}
