from kokoro_onnx import Kokoro
import soundfile as sf, time
engine=Kokoro('media/video-tools/models/kokoro-v1.0.int8.onnx','media/video-tools/models/voices-v1.0.bin')
t=time.time(); audio,sr=engine.create('Profe, piensa en la clase que tienes que preparar para mañana. Vamos a pedirle a la inteligencia artificial una actividad de lectura para séptimo.',voice='ef_dora',speed=1.04,lang='es')
sf.write('media/cursos/introduccion-ia-docentes/muestra-voz-kokoro.wav',audio,sr)
print({'samples':len(audio),'seconds':len(audio)/sr,'rate':sr,'compute_seconds':round(time.time()-t,1)})
