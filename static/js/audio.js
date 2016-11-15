// adult male will have a fundamental frequency from 85 to 180 Hz,
// and that of a typical adult female from 165 to 255 Hz
// const dB = 20 * Math.log10(Math.abs(data));
class Iridium {
  constructor () {
    this.thresholdEl = document.querySelector('#threshold');
    this.delayEl = document.querySelector('#delay');
    this.recordToggleEl = document.querySelector('#record-toggle');
    this.emitter = new EventEmitter();
    this.thresholdLevel = 1;
    this.delayTime = 1;
    this.started = false;
    this.inputAudioContext = new AudioContext();
    this.inputAudioProcessor = null;
    this.inputAudioSource = null;
    this.inputAudioAnalyser = null;
    this.inputAudioCache = [];
    this.inputAudioCacheLimit = 1000000;
    this.inputBufferSize = 512;
    this.isSpeaking = false;
    this.playbackTimeout = null;
    this.playbackAudioContext = null;

    // reset ranges
    this.thresholdEl.value = this.thresholdLevel;
    this.delayEl.value = this.delayTime;

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
    // http://stackoverflow.com/questions/4562354/javascript-detect-if-event-lister-is-supported
    this.thresholdEl.addEventListener('input', (ev) =>
      this.emitter.emit('thresholdChanged', ev.target.value));

    this.delayEl.addEventListener('input', (ev) =>
      this.emitter.emit('delayTimeChanged', ev.target.value));
  }

  startClicked () {
    return navigator.mediaDevices.getUserMedia({audio: true})
      .then((stream) => {
        if (!this.inputAudioSource) {
//          const audioEl = document.createElement('audio');
//          audioEl.src = 'http://localhost:4000/martian_sample.mp3';
////          audioEl.src = 'http://localhost:4000/martian_silence.mp3';
////          audioEl.src = 'http://localhost:4000/bk_hach_001603_sample.mp3';
////          audioEl.src = 'http://localhost:4000/bk_peng_002515_sample.mp3';
////          audioEl.src = 'http://localhost:4000/bk_podm_000293_sample.mp3';
//          audioEl.loop = true;
//          audioEl.play();
//          this.inputAudioSource = this.inputAudioContext.createMediaElementSource(audioEl);

          this.inputAudioSource = this.inputAudioContext
            .createMediaStreamSource(stream);

          this.inputAudioProcessor = this.inputAudioContext
            .createScriptProcessor(this.inputBufferSize, 1, 1);

          this.inputAudioSource.connect(this.inputAudioProcessor);
          this.inputAudioProcessor.connect(this.inputAudioContext.destination);

          // copy audio data to cache
          this.inputAudioProcessor.onaudioprocess = (audioEvent) => {
            this.inputAudioCache.push(audioEvent.inputBuffer.getChannelData(0)
              .slice(0));

            // add conditional here to start removing oldest audio when some
            // limit is reached. Unsure what the limit should be yet.
            // console.log(this.inputAudioCache.length * this.inputBufferSize);
          };

          // analyser relies on audioSource to exist, so init must be run here
          this.initCheckIsSpeaking();

          this.initVisualizeAudio();
        }

        this.started = true;

        if (this.inputAudioContext.state === 'suspended') {
          this.inputAudioContext.resume();
        }
      })
      .catch((err) => {
        console.log(err);
        alert(err.name + ' ' + err.message);
      });
  }

  stopClicked () {
    this.started = false;
    this.inputAudioContext.suspend();
    this.inputAudioCache = [];
  }

  thresholdChanged (val) {
    this.thresholdLevel = val * 1;
  }

  delayTimeChanged (val) {
    this.delayTime = val * 1;
  }

  speakingStatusChanged () {
    // if not speaking, start timeout for delayTime, then play in timeout
    // if true, clear timeout and stop playback

    if (!this.isSpeaking) {
      this.playbackTimeout = setTimeout(() => {
        this.playback();
        this.stopClicked();
      }, this.delayTime * 1000);
    } else {
      if (this.playbackAudioContext) {
        this.playbackAudioContext.suspend();
        this.playbackAudioContext = null;
        this.startClicked();
      }

      clearTimeout(this.playbackTimeout);
    }
  }

  playback () {
    this.playbackAudioContext = new AudioContext();

    // guessing the number of frames is equal to how many are stored in audioCache
    const frameCount = this.inputAudioCache.length * this.inputBufferSize;
    const playbackAudioBuffer = this.playbackAudioContext.createBuffer(1,
      frameCount, this.playbackAudioContext.sampleRate);
    const playbackAudioBufferChannel = playbackAudioBuffer.getChannelData(0);

    // copy audio frame data to audioBuffer
    let i = 0;
    this.inputAudioCache.forEach((frame) => {
      frame.forEach((data) => {
        playbackAudioBufferChannel[i] = data;

        i++;
      });
    });

    this.inputAudioCache = [];

    const source = this.playbackAudioContext.createBufferSource();

    source.buffer = playbackAudioBuffer;
    source.connect(this.playbackAudioContext.destination);

    source.loop = true;
    source.start();
  }

  initCheckIsSpeaking () {
    this.inputAudioAnalyser = this.inputAudioContext.createAnalyser();
    const dataArray = new Float32Array(this.inputAudioAnalyser.frequencyBinCount);
    const threshold = .002;
    const stackDepth = 10;

    this.inputAudioSource.connect(this.inputAudioAnalyser);

    let ampStack = [];

    setInterval(() => {
      if (this.started) {
        this.inputAudioAnalyser.getFloatTimeDomainData(dataArray);

        ampStack.push(Math.max.apply(Math, dataArray));

        // remove oldest sample
        if (ampStack.length > stackDepth) {
          ampStack.shift();
        }

        const runningAmpAvg = ampStack.reduce((p, c) => p + c, 0) / stackDepth;

        if (runningAmpAvg > (this.thresholdLevel * threshold) &&
          !this.isSpeaking) {
          this.isSpeaking = true;
          this.emitter.emit('speakingStatusChanged');
        }

        if (runningAmpAvg <= (this.thresholdLevel * threshold) &&
          this.isSpeaking) {
          this.isSpeaking = false;
          this.emitter.emit('speakingStatusChanged');
        }
      }
    }, 10);
  }

  initVisualizeAudio () {
    const canvas = document.querySelector('#display-canvas');
    const canvasCtx = canvas.getContext('2d');
    const dimensions = window.getComputedStyle(canvas);
    const width = dimensions.width.replace('px', '') * 1;
    const height = dimensions.height.replace('px', '') * 1;
    const barWidth = width / this.inputAudioAnalyser.frequencyBinCount;

    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);

    canvasCtx.clearRect(0, 0, width, height);

    canvasCtx.fillStyle = '#000';
    canvasCtx.fillRect(0, 0, width, height);

    const draw = () => {
      if (this.started) {
        const dataArray = new Float32Array(this.inputAudioAnalyser.frequencyBinCount);
        this.inputAudioAnalyser.getFloatTimeDomainData(dataArray);

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

      requestAnimationFrame(draw);
    }
    
    draw();
  }
};

window.addEventListener('load', () => {
  const delayer = new Iridium();
});



//window.addEventListener('load', () => {
//  navigator.mediaDevices.getUserMedia({audio: true})
//    .then((stream) => {
//      const context = new AudioContext();
//      // microphone
//      const source = context.createMediaStreamSource(stream);
//      const processor = context.createScriptProcessor(1024, 1, 1);
//
//      source.connect(processor);
//      processor.connect(context.destination);
//
////      const audioCache = [];
//
//      const start = Date.now();
//      const delay = 0;
//
//      let len = 0;
//
//      // live output
//      processor.onaudioprocess = (data) => {
//        const channelCount = data.outputBuffer.numberOfChannels;
//
//        for (let i = 0; i < channelCount; i++) {
//          const inputChannelData = data.inputBuffer.getChannelData(i);
//          const outputChannelData = data.outputBuffer.getChannelData(i);
//
//          for (let j = 0; j < outputChannelData.length; j++) {
//            outputChannelData[j] = inputChannelData[j];
//            len += inputChannelData[j];
//          }
//        }
//        
////        console.log(len);
//        len = 0;
//      };
//    })
//});

//
//
//// delayed output
////      processor.onaudioprocess = (data) => {
////        const channelCount = data.outputBuffer.numberOfChannels;
////
////        for (let i = 0; i < channelCount; i++) {
////          let inputChannelData = data.inputBuffer.getChannelData(i);
//////          audioCache.push(data.inputBuffer.getChannelData(i).slice(0));
//////
//////          // outputChannelData should always be the current live output to the speaker
//////          if (Date.now() > start + delay) {
//////            const oldestInputData = audioCache.shift();
//////            const outputChannelData = data.outputBuffer.getChannelData(i);
//////
//////            for (let j = 0; j < oldestInputData.length; j++) {
//////              outputChannelData[j] = oldestInputData[j];
//////            }
//////
////////            // add noise to each output sample
////////            outputData[sample] += ((Math.random() * 2) - 1) * 0.2;
//////          }
////        }
////      };
//
////       analyze the frequency data and display data
////      const analyser = context.createAnalyser();
////      const dataArray = new Float32Array(analyser.frequencyBinCount);
////
////      source.connect(analyser);
////
////      setInterval(() => {
////        analyser.getFloatFrequencyData(dataArray);
////        frequencyDataDisplay.innerHTML = dataArray;
////      }, 1000);
//
//
//
//
//
////      const canvas = document.querySelector('#display-canvas');
////      const canvasCtx = canvas.getContext('2d');
////      const dimensions = window.getComputedStyle(canvas);
////
////      const width = dimensions.width.replace('px', '') * 1;
////      const height = dimensions.height.replace('px', '') * 1;
////
////      const barWidth = width / bufferLength;
////
////      canvasCtx.clearRect(0, 0, width, height);
////
////      canvasCtx.fillStyle = '#000';
////      canvasCtx.fillRect(0, 0, width, height);
//
//      const analyser = context.createAnalyser();
//      const bufferLength = analyser.frequencyBinCount;
//      const dataArray = new Float32Array(bufferLength);
//
//      //analyser.fftSize = 2048;
//
//      source.connect(analyser);
//
//
//
////      const dB = 20 * Math.log10(Math.abs(data));
//      let speaking = false;
//      const threshold = .002;
//      const ampStackDepth = 10;
//      let ampStack = [];
//
//      setInterval(() => {
//        analyser.getFloatTimeDomainData(dataArray);
//
//        let maxAmplitude = 0;
//
//        dataArray.forEach((data, i) => {
//          const absData = Math.abs(data);
//
//          if (absData > maxAmplitude) {
//            maxAmplitude = absData;
//          }
//        });
//
//        ampStack.push(maxAmplitude);
//
//        if (ampStack.length > ampStackDepth) {
//          ampStack = ampStack.slice(1);
//        }
//
//        const runningAmpAvg = ampStack.reduce((p, c) => p + c, 0) / ampStackDepth;
//
//        speaking = runningAmpAvg > threshold;
//        
////        frequencyView.innerHTML = speaking;
//      }, 10);
//
//
//      const draw = () => {
//        analyser.getFloatTimeDomainData(dataArray);
//
//        bgColor = speaking ? '#000' : '#cc00cc';
//
//        canvasCtx.fillStyle = bgColor;
//        canvasCtx.fillRect(0, 0, width, height);
//
//        let x = 0;
//
//        dataArray.forEach((data, i) => {
//          const barHeight = data * (height / 2);
//
//          canvasCtx.fillStyle = '#cc0000';
//          canvasCtx.fillRect(x, height / 2, barWidth, barHeight);
//          x += barWidth;
//        });
//
//        requestAnimationFrame(draw);
//      }
//
//      draw();
//    });
//});
