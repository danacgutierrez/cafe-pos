export class DomainError extends Error {
  // new.target.name gives each subclass its own error name automatically (e.g. "InsufficientStockError"),
  // without repeating `this.name = "..."` in every subclass constructor.
  constructor(readonly message: string) {
    super(message);
    this.name = new.target.name;
  }
}