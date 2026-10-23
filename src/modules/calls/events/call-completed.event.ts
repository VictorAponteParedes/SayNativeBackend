export class CallCompletedEvent {
  constructor(
    public readonly callId: string,
    public readonly durationSeconds: number,
    public readonly callerId: string,
    public readonly receiverId: string,
    public readonly coinsCharged: number,
  ) {}
}
