// @ts-check

import Axios, {
    AxiosResponse,
    AxiosRequestConfig
} from 'axios';
import * as cheerio from 'cheerio';
import * as Crypto from 'crypto';

class KakaoTV {
    private videoId: string;
    private appVersion: string = '88.0.4324.190';

    /**
     * 
     * @param videoId kakaoTV video Id
     * @example url: 'https://tv.kakao.com/v/12345678' -> videoId: '12345678'
     * @constructor
     */
    constructor(videoId: string) {
        this.videoId = videoId;
    }

    /**
     * 
     * @returns random hex player uuid string
     * @private
     */
    private getPlayerUUID(): string {
        return Crypto.randomBytes(16).toString('hex');
    }

    /**
     * 
     * @param quality video quality
     * @returns quality index
     * @private
     */
    private getProfileString(quality: number): number {
        return [240, 360, 480, 720, 1080].indexOf(quality);
    }

    /**
     * 
     * @param url KakaoTV URL to get embeded url
     * @returns embeded url
     * @private
     */
    private async getEmbededURL(url: string): Promise<string> {
        const response: AxiosResponse = await Axios.get(`https://tv.kakao.com/oembed?url=${url}`);
        const document: any = response.data;
        const $: cheerio.Root = cheerio.load(document.html);
        return $('iframe').attr('src');
    }

    /**
     * 
     * @returns mp4 video url
     * @private
     */
    private async getTid(): Promise<string> {
        const response: AxiosResponse = await Axios.get(`https://play-tv.kakao.com/katz/v3/ft/cliplink/${this.videoId}/readyNplay`, {
            params: {
                player: 'monet_html5',
                uuid: this.getPlayerUUID(),
                profile: 'HIGH4',
                service: 'und_player',
                section: 'und_player',
                fields: 'seekUrl,abrVideoLocationList',
                appVersion: this.appVersion,
                startPosition: '0',
                dteType: 'PC',
                continuousPlay: 'false',
                drmType: 'widevine',
                [`${Date.now()}`]: ''
            },
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': this.getEmbededURL(`https://tv.kakao.com/v/${this.videoId}`),
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.appVersion} Safari/537.36`
            }
        } as AxiosRequestConfig);
        return response.data.videoLocation.url;
    }

    /**
     * 
     * @param quality quality of the video to extract as mp4
     * @returns extracted mp4 video url
     * @private
     */
    private async _extract(quality: number): Promise<string> {
        const response: AxiosResponse = await Axios.get(`https://play-tv.kakao.com/katz/v3/ft/cliplink/${this.videoId}/videoLocation`, {
            params: {
                service: 'und_player',
                section: 'und_player',
                player: 'monet_html5',
                tid: await this.getTid(),
                profile: [
                    'LOW',
                    'BASE',
                    'MAIN',
                    'HIGH',
                    'HIGH4'
                ][this.getProfileString(quality)] ?? 'MAIN',
                dteType: 'PC',
                contentType: 'MP4'
            },
            headers: {
                'Accept': '*/*',
                'Referer': this.getEmbededURL(`https://tv.kakao.com/v/${this.videoId}`),
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.appVersion} Safari/537.36`
            }
        } as AxiosRequestConfig);
        const document: VideoResponse = response.data;
        return document.videoLocation.url;
    }

    /**
     * 
     * @param qualities qualities of the video to extract as mp4
     * @returns extracted mp4 video urls
     * @example new KakaoTV('videoId').extract(240, 360, 480, 720, 1080).then(r => console.log(r));
     * @public
     */
    public async extract(...qualities: number[]): Promise<ExtractedVideos> {
        const result: any = {};
        const promises: Promise<void>[] = qualities.map(async (element: number) => {
            await this._extract(element).then(r => result[`${element}p`] = r);
        });
        await Promise.all(promises);
        return result as ExtractedVideos;
    }
}

interface VideoResponse {
    videoLocation: {
        url: string,
        profile: string,
        contentType: string
    }
}

interface ExtractedVideos {
    '240p'?: string,
    '480p'?: string,
    '720p'?: string,
    '1080p'?: string
}

export default KakaoTV;

export {
    VideoResponse,
    ExtractedVideos
}
