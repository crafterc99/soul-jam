export interface State<T> {
  name: string;
  enter?(entity: T): void;
  update?(entity: T, dt: number): void;
  exit?(entity: T): void;
}

export class StateMachine<T> {
  private states: Map<string, State<T>> = new Map();
  private _currentState: State<T> | null = null;
  private entity: T;

  constructor(entity: T) {
    this.entity = entity;
  }

  get currentStateName(): string {
    return this._currentState?.name ?? '';
  }

  addState(state: State<T>): void {
    this.states.set(state.name, state);
  }

  setState(name: string): void {
    const next = this.states.get(name);
    if (!next) throw new Error(`State '${name}' not found`);
    if (this._currentState === next) return;

    this._currentState?.exit?.(this.entity);
    this._currentState = next;
    this._currentState.enter?.(this.entity);
  }

  update(dt: number): void {
    this._currentState?.update?.(this.entity, dt);
  }

  isInState(name: string): boolean {
    return this._currentState?.name === name;
  }
}
