// adult male will have a fundamental frequency from 85 to 180 Hz, and that of a typical adult female from 165 to 255 Hz
class Iridium {
  constructor () {
    this.resetDefaults();

    // reset ranges
    this.thresholdEl.value = this.thresholdLevel;
    this.delayEl.value = this.delayTime;

    const eventList = {
      'startClicked': this.startClicked,
      'stopClicked': this.stopClicked,
      'thresholdChanged': this.thresholdChanged,
      'delayTimeChanged': this.delayTimeChanged,
      'audioProcessData': this.audioProcessData
    };

    // register events in eventEmitter
    for (let i in eventList) {
      this.emitter.on(i, eventList[i].bind(this));
    }

    // bind dom elements to trigger their events
    this.startEl.addEventListener('click', () => this.emitter.emit(
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

  resetDefaults () {
    this.thresholdEl = document.querySelector('#threshold');
    this.delayEl = document.querySelector('#delay');
    this.startEl = document.querySelector('#start');
    this.thresholdLevel = 1;
    this.delayTime = 1;
    this.started = false;
    this.audioContext = null;
    this.audioProcessor = null;
    this.audioSource = null;
    this.emitter = new EventEmitter();
  }

  startClicked () {
    return navigator.mediaDevices.getUserMedia({audio: true})
      .then((stream) => {
        if (!this.audioContext) {
          this.audioContext = new AudioContext();
          this.audioSource = this.audioContext.createMediaStreamSource(stream);
          this.audioProcessor = this.audioContext
            .createScriptProcessor(512, 1, 1);

          this.audioSource.connect(this.audioProcessor);
          this.audioProcessor.connect(this.audioContext.destination);

          this.audioProcessor.onaudioprocess = this.audioProcessData;
        }
        
        this.started = true;
        this.startEl.value = 'Stop';

        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      })
      .catch((err) => {
        console.log(err);
        alert(err.name + ' ' + err.message);
      });
  }

  stopClicked () {
    this.startEl.value = 'Start';
    this.started = false;
    this.audioContext.suspend();
  }
  
  thresholdChanged (val) {
    console.log('##', val);
  }
  
  delayTimeChanged (val) {
    console.log('##', val);
  }
  
  audioProcessData (data) {
//    console.log(data);
//            console.log(data);
////            if (this.started) {
////              const channelCount = data.outputBuffer.numberOfChannels;
////
////              for (let i = 0; i < channelCount; i++) {
////                const inputChannelData = data.inputBuffer.getChannelData(i);
////                const outputChannelData = data.outputBuffer.getChannelData(i);
////
////                for (let j = 0; j < outputChannelData.length; j++) {
////                  outputChannelData[j] = inputChannelData[j];
////                }
////              }
////
////            }
////            console.log(this.audioProcessor.onaudioprocess);
////            return this.audioProcessData;
//          }

//          const audioCache = [];

  }
};

window.addEventListener('load', () => {
  // setup input/change events on ranges to update their values when changed
  document.querySelectorAll('input[type=range]')
    .forEach(item => ['input', 'change'].forEach(str =>
      item.addEventListener(str, ev =>
        item.setAttribute('value', ev.target.value))));

  const delayer = new Iridium();

  return;
});



window.addEventListener('load', () => {
  return;

  navigator.mediaDevices.getUserMedia({audio: true})
    .then((stream) => {
      const audioSource = document.createElement('audio');
      audioSource.src = 'http://localhost:4000/martian_sample.mp3';
//      audioSource.src = 'http://localhost:4000/martian_silence.mp3';
//      audioSource.src = 'http://localhost:4000/bk_hach_001603_sample.mp3';
//      audioSource.src = 'http://localhost:4000/bk_peng_002515_sample.mp3';
//      audioSource.src = 'http://localhost:4000/bk_podm_000293_sample.mp3';
//      audioSource.loop = true;
//setTimeout(() => audioSource.play(), 0);

      const context = new AudioContext();
      // microphone
//      const source = context.createMediaStreamSource(stream);
      const source = context.createMediaElementSource(audioSource);
      const processor = context.createScriptProcessor(512, 1, 1);

      source.connect(processor);
      processor.connect(context.destination);

      const audioCache = [];

      const start = Date.now();
      const delay = 0;

// live output
      processor.onaudioprocess = (data) => {
        const channelCount = data.outputBuffer.numberOfChannels;

        for (let i = 0; i < channelCount; i++) {
          const inputChannelData = data.inputBuffer.getChannelData(i);
          const outputChannelData = data.outputBuffer.getChannelData(i);

          for (let j = 0; j < outputChannelData.length; j++) {
            outputChannelData[j] = inputChannelData[j];
          }
        }
      };


// delayed output
//      processor.onaudioprocess = (data) => {
//        const channelCount = data.outputBuffer.numberOfChannels;
//
//        for (let i = 0; i < channelCount; i++) {
//          let inputChannelData = data.inputBuffer.getChannelData(i);
////          audioCache.push(data.inputBuffer.getChannelData(i).slice(0));
////
////          // outputChannelData should always be the current live output to the speaker
////          if (Date.now() > start + delay) {
////            const oldestInputData = audioCache.shift();
////            const outputChannelData = data.outputBuffer.getChannelData(i);
////
////            for (let j = 0; j < oldestInputData.length; j++) {
////              outputChannelData[j] = oldestInputData[j];
////            }
////
//////            // add noise to each output sample
//////            outputData[sample] += ((Math.random() * 2) - 1) * 0.2;
////          }
//        }
//      };

//       analyze the frequency data and display data
//      const analyser = context.createAnalyser();
//      const dataArray = new Float32Array(analyser.frequencyBinCount);
//
//      source.connect(analyser);
//
//      setInterval(() => {
//        analyser.getFloatFrequencyData(dataArray);
//        frequencyDataDisplay.innerHTML = dataArray;
//      }, 1000);

      const analyser = context.createAnalyser();
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      //analyser.fftSize = 2048;

      source.connect(analyser);

      const canvas = document.querySelector('#display-canvas');
      const canvasCtx = canvas.getContext('2d');
      const dimensions = window.getComputedStyle(canvas);

      const width = dimensions.width.replace('px', '') * 1;
      const height = dimensions.height.replace('px', '') * 1;

      const barWidth = width / bufferLength;

      canvasCtx.clearRect(0, 0, width, height);

      canvasCtx.fillStyle = '#000';
      canvasCtx.fillRect(0, 0, width, height);


//      const dB = 20 * Math.log10(Math.abs(data));
      let speaking = false;
      const threshold = .002;
      const ampStackDepth = 10;
      let ampStack = [];

      setInterval(() => {
        analyser.getFloatTimeDomainData(dataArray);

        let maxAmplitude = 0;

        dataArray.forEach((data, i) => {
          const absData = Math.abs(data);

          if (absData > maxAmplitude) {
            maxAmplitude = absData;
          }
        });

        ampStack.push(maxAmplitude);

        if (ampStack.length > ampStackDepth) {
          ampStack = ampStack.slice(1);
        }

        const runningAmpAvg = ampStack.reduce((p, c) => p + c, 0) / ampStackDepth;

        speaking = runningAmpAvg > threshold;
        
//        frequencyView.innerHTML = speaking;
      }, 10);


      const draw = () => {
        analyser.getFloatTimeDomainData(dataArray);

        bgColor = speaking ? '#000' : '#cc00cc';

        canvasCtx.fillStyle = bgColor;
        canvasCtx.fillRect(0, 0, width, height);

        let x = 0;

        dataArray.forEach((data, i) => {
          const barHeight = data * (height / 2);

          canvasCtx.fillStyle = '#cc0000';
          canvasCtx.fillRect(x, height / 2, barWidth, barHeight);
          x += barWidth;
        });

        requestAnimationFrame(draw);
      }

      draw();
    });
});
