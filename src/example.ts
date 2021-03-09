import KakaoTV, {
    ExtractedVideos
} from './KakaoTV';
import * as fs from 'fs';
import Axios from 'axios';

async function download(videoId: string) {
    const videos: ExtractedVideos = await new KakaoTV(videoId).extract(1080);
    const url: string = videos['1080p'];
    await Axios.get(url, {
        responseType: 'stream'
    }).then(response => {
        response.data.pipe(fs.createWriteStream('MyVideo.mp4'));
    });
}