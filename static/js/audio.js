// adult male will have a fundamental frequency from 85 to 180 Hz,
// and that of a typical adult female from 165 to 255 Hz
// const dB = 20 * Math.log10(Math.abs(data));
class Iridium {
  constructor () {
    this.thresholdEl = document.querySelector('#threshold');
    this.delayEl = document.querySelector('#delay');
    this.recordToggleEl = document.querySelector('#record-toggle');

    this.emitter = new EventEmitter();
    this.inputAudioContext = new AudioContext();
    this.playbackAudioContext = new AudioContext();
    this.inputAudioCache = new Float32Array(0);
    this.isSpeakingCache = [];

    this.inputBufferSize = 512;
    // minimal rms pcm data level
    this.thresholdLevel = .002;
    this.delayTime = 1;
    this.isSpeaking = false;
    this.isPlaying = false;
    this.started = false;
    this.playbackTimeout = null;

    // reset ranges
    this.thresholdEl.value = 1;
    this.delayEl.value = 1;

    this.setupEvents();

    this.setupInputAudio()
      .then(() => {
        this.initVisualizeAudio();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  setupEvents () {
    const eventList = {
      'startClicked': this.startClicked,
      'stopClicked': this.stopClicked,
      'thresholdChanged': this.thresholdChanged,
      'delayTimeChanged': this.delayTimeChanged,
      'speakingStatusChanged': this.speakingStatusChanged
    };

    // register events in eventEmitter
    for (let i in eventList) {
      this.emitter.on(i, eventList[i].bind(this));
    }

    // bind dom elements to trigger their events
    // setup input/change events on ranges to update their values when changed
    document.querySelectorAll('input[type=range]')
      .forEach(item => ['input', 'change'].forEach(str =>
        item.addEventListener(str, (ev) =>
          item.setAttribute('value', ev.target.value))));

    this.recordToggleEl.addEventListener('change', () => this.emitter.emit(
      this.started ? 'stopClicked' : 'startClicked'));

    // may be an issue where IE doesn't trigger 'input' events on range inputs
    // and issues a 'change' event. Chrome/Safari trigger them separately. May
    // need to add a workaround for this in the future
    // http://stackoverflow.com/questions/4562354/javascript-detect-if-event-
    // lister-is-supported
    this.thresholdEl.addEventListener('input', (ev) =>
      this.emitter.emit('thresholdChanged', ev.target.value));

    this.delayEl.addEventListener('input', (ev) =>
      this.emitter.emit('delayTimeChanged', ev.target.value));
  }

  setupInputAudio () {
    return navigator.mediaDevices.getUserMedia({audio: true})
      .then((stream) => {
        const inputAudioSource = this.inputAudioContext
          .createMediaStreamSource(stream);

        const inputAudioProcessor = this.inputAudioContext
          .createScriptProcessor(this.inputBufferSize, 1, 1);

        inputAudioSource.connect(inputAudioProcessor);
        inputAudioProcessor.connect(this.inputAudioContext.destination);

        inputAudioProcessor.addEventListener('audioprocess',
          this.audioProcessEvent.bind(this));
      });
  }

  audioProcessEvent (audioEvent) {
    if (this.started) {
      const buff = audioEvent.inputBuffer.getChannelData(0).slice(0);

      // store last 10 frames for voice detection
      this.isSpeakingCache = buff.slice(-10);

      // don't want to check on every event
      if (Date.now() % 8 === 0) {
        this.checkIsSpeaking();
      }

      // if not playing, then record
      if (!this.isPlaying) {
        let tmp = new Float32Array(this.inputAudioCache.length + buff.length);

        tmp.set(this.inputAudioCache);
        tmp.set(buff, this.inputAudioCache.length);

        this.inputAudioCache = tmp;
      }
    }
  }

  checkIsSpeaking () {
    const runningAmpAvg = this.isSpeakingCache.reduce((p, c) => p +
      Math.abs(c) , 0) / this.isSpeakingCache.length;

    if (runningAmpAvg > this.thresholdLevel && !this.isSpeaking) {
      this.isSpeaking = true;
      this.emitter.emit('speakingStatusChanged');
    }

    if (runningAmpAvg <= this.thresholdLevel && this.isSpeaking) {
      this.isSpeaking = false;
      this.emitter.emit('speakingStatusChanged');
    }
  }

  speakingStatusChanged () {
    if (this.isSpeaking) {
      this.isPlaying = false;
      this.playbackAudioContext.suspend();
      clearInterval(this.playbackTimeout);
    } else {
      this.playbackTimeout = setTimeout(() => {
        this.isPlaying = true;
        this.playback();
      }, this.delayTime * 1000);
    }
  }

  playback () {
    return this.playbackAudioContext
      .close()
      .then(() => {
        this.playbackAudioContext = new AudioContext();

        // trim off excess delay silence at end of section. Add 1 second exta
        // between playbacks
        this.inputAudioCache = this.inputAudioCache.slice(0,
          this.inputAudioCache.length - (this.inputAudioContext.sampleRate *
          this.delayTime) + this.inputAudioContext.sampleRate);

        const buff = this.playbackAudioContext.createBuffer(1,
          this.inputAudioCache.length, this.inputAudioContext.sampleRate);

        buff.copyToChannel(this.inputAudioCache, 0, 0);

        this.inputAudioCache = new Float32Array(0);

        const source = this.playbackAudioContext.createBufferSource();
        source.buffer = buff;
        source.connect(this.playbackAudioContext.destination);

        source.loop = true;
        source.start(0);
      });
  }

  startClicked () {
    this.started = true;
  }

  stopClicked () {
    this.started = false;
    this.inputAudioCache = new Float32Array(0);
  }

  thresholdChanged (val) {
    // .002 is a base level of silent room noise.
    this.thresholdLevel = (val * .001) + .001;
  }

  delayTimeChanged (val) {
    this.delayTime = val * 1;
  }

  initVisualizeAudio () {
    const canvas = document.querySelector('#display-canvas');
    const canvasCtx = canvas.getContext('2d');
    const dimensions = window.getComputedStyle(canvas);
    const width = dimensions.width.replace('px', '') * 1;
    const height = dimensions.height.replace('px', '') * 1;
    const barWidth = width / this.inputBufferSize;

    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);

    canvasCtx.fillStyle = '#000';
    canvasCtx.fillRect(0, 0, width, height);

    const draw = () => {
      if (this.started) {
        const dataArray = this.inputAudioCache.slice(-this.inputBufferSize);

        if (dataArray) {
          const bgColor = '#000';
          canvasCtx.fillStyle = '#000';
          canvasCtx.fillRect(0, 0, width, height);

          let x = 0;

          dataArray.forEach((data, i) => {
            const barHeight = data * (height / 2);

            canvasCtx.fillStyle = '#cc0000';
            canvasCtx.fillRect(x, height / 2, barWidth, barHeight);
            x += barWidth;
          });
        }
      }

      requestAnimationFrame(draw);
    }

    draw();
  }
}

window.addEventListener('load', () => {
  const delay = new Iridium();
});
