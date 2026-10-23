export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface SignalingPayload {
  callId: string;
  signal: {
    type: 'offer' | 'answer';
    sdp: string;
  };
}

export interface IceCandidatePayload {
  callId: string;
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  };
}
