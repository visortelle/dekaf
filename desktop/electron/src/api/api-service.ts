export type GetPathsRequest = {
  type: "GetPathsRequest"
};

export type GetPathsResponse = {
  type: "GetPathsRequest"
};

export type ApiEvent = GetPathsRequest |
  GetPathsResponse;

export type ApiService = {
  handleEvent: (event: Electron.IpcMainEvent, arg: any) => void
};

export const apiService: ApiService = {
  handleEvent: (event: Electron.IpcMainEvent, arg: any) => {
    console.log('incoming event', event);
    event.reply('api', { type: "GetPathsResponse" });
  }
};
