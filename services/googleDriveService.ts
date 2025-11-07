
// This service wraps the Google Drive API (gapi) to provide a cleaner interface.

const APP_FOLDER_NAME = 'Loopxy-MultiTrac-Data';

let gapi: any;
let google: any;
let tokenClient: any;

export const loadGapi = (): Promise<void> => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            (window as any).gapi.load('client:oauth2', () => {
                gapi = (window as any).gapi;
                google = (window as any).google;
                resolve();
            });
        };
        document.body.appendChild(script);
    });
};

export const initClient = async (
    apiKey: string,
    clientId: string,
    scopes: string,
    authCallback: (isSignedIn: boolean) => void
): Promise<void> => {
    await gapi.client.init({
        apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        callback: async (resp: any) => {
            if (resp.error) {
                console.error(resp.error);
                return;
            }
            authCallback(gapi.client.getToken() !== null);
        },
    });
    
    // Check initial auth state
    authCallback(gapi.client.getToken() !== null);
};

export const signIn = () => {
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
};

export const signOut = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
        });
    }
};

export const getUserProfile = (): any | null => {
    // This is not standard gapi, but a common pattern. Requires additional setup with People API.
    // For simplicity, we'll get this info differently if needed.
    // Let's assume the user info comes from another source after login for now.
    // The new Google Identity Services doesn't expose profile info this way.
    // A proper implementation uses the JWT from the auth response.
    // For this demo, we'll return a placeholder or handle it in the context.
    return null; // The context will need to be adapted. Let's simplify and rely on what the token gives.
}

export const findOrCreateAppFolder = async (): Promise<string> => {
    const response = await gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
    });

    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const fileMetadata = {
            'name': APP_FOLDER_NAME,
            'mimeType': 'application/vnd.google-apps.folder'
        };
        const folder = await gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });
        return folder.result.id;
    }
};


export const listFiles = async (folderId: string): Promise<any[]> => {
    const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
    });
    return response.result.files || [];
};

export const getFileContent = async (fileId: string): Promise<string | null> => {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return response.body;
    } catch (error) {
        console.error("Error getting file content:", error);
        return null;
    }
};

export const getFileBlob = async (fileId: string): Promise<Blob | null> => {
     try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return new Blob([response.body], { type: response.headers['Content-Type'] });
    } catch (error) {
        console.error("Error getting file blob:", error);
        return null;
    }
}


export const createFile = (folderId: string, name: string, content: string | Blob, contentType: string) => {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({
        name,
        parents: [folderId]
    })], { type: 'application/json' }));

    form.append('file', content instanceof Blob ? content : new Blob([content], {type: contentType}));

    return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
        body: form,
    });
};

export const updateFile = (fileId: string, content: string | Blob) => {
    const contentType = content instanceof Blob ? content.type : 'application/json';

    return fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: new Headers({ 
            'Authorization': 'Bearer ' + gapi.client.getToken().access_token,
            'Content-Type': contentType,
        }),
        body: content,
    });
};
