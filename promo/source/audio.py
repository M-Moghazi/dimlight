import numpy as np, wave
sr=48000; T=20.0; n=int(sr*T); t=np.arange(n)/sr
rng=np.random.default_rng(3)
def env(a,att,dec,rel_end=None):
    e=np.clip((t-a)/att,0,1)
    return e
def smooth(x,k):
    # one-pole lowpass
    y=np.empty_like(x); acc=0.0; a=k
    for i in range(len(x)): acc+= a*(x[i]-acc); y[i]=acc
    return y
out=np.zeros((n,2))
hz=lambda m:440*2**((m-69)/12)
# 1) glare shimmer 0-2.5: bright high cluster crescendo, cut by reveal
g=np.zeros(n)
for m,det in [(88,0),(91,0.3),(95,-0.2)]:
    g+=np.sin(2*np.pi*hz(m)*(1+det*1e-3)*t)
genv=np.clip(t/2.3,0,1)**2*np.clip((2.75-t)/0.5,0,1)
out+=np.stack([g,g],1)*(genv*0.025)[:,None]
# 2) whoosh at reveal (filtered noise swell)
nz=rng.standard_normal(n)
lp=smooth(nz,0.04); lp/=np.abs(lp).max()
w=np.exp(-((t-2.75)/0.35)**2)
out+=np.stack([lp,np.roll(lp,240)],1)*(w*0.35)[:,None]
# 3) warm pad from 2.6 to end: chord changes
chords=[(2.6,[50,57,62,66,69]),(8.3,[47,54,59,62,66]),(12.0,[43,50,55,59,64]),(14.3,[45,52,57,61,64]),(17.7,[50,57,62,66,69,74])]
pad=np.zeros((n,2))
for i,(st,notes) in enumerate(chords):
    en=chords[i+1][0] if i+1<len(chords) else T
    e=np.clip((t-st)/0.9,0,1)*np.clip((en+0.9-t)/0.9,0,1)
    for k,m in enumerate(notes):
        f=hz(m)
        for side,dt in ((0,1.0015),(1,0.9985)):
            s=np.sin(2*np.pi*f*dt*t+k)+0.25*np.sin(2*np.pi*2*f*dt*t)+0.08*np.sin(2*np.pi*3*f*t)
            pad[:,side]+=s*e*(0.05 if m>=60 else 0.07)
pad*= (0.75+0.25*np.sin(2*np.pi*0.25*t))[:,None]
fade=np.clip((T-t)/1.2,0,1)
out+=pad*fade[:,None]
# 4) bells (icon in, end card) and soft ticks (taps)
def bell(at,m,amp):
    e=np.where(t>=at,np.exp(-(t-at)*2.2),0)
    f=hz(m); s=sum(a*np.sin(2*np.pi*f*r*(t-at)) for r,a in [(1,1),(2.76,.35),(5.4,.12)])
    return s*e*amp
for at,ms in [(2.85,[81,86]),(17.75,[86,90,93]),(16.2,[93])]:
    for j,m in enumerate(ms):
        b=bell(at+j*0.09,m,0.09); out[:,0]+=b; out[:,1]+=np.roll(b,300)
for at in (11.72,12.82,6.1):
    e=np.where(t>=at,np.exp(-(t-at)*60),0)
    s=np.sin(2*np.pi*1800*(t-at))*e*0.12; out+=np.stack([s,s],1)
# soft swish for wipe
w2=np.exp(-((t-7.0)/0.7)**2)*0.12; hp=nz-smooth(nz,0.2); hp/=np.abs(hp).max()
out+=np.stack([hp*w2*np.clip((t-6.1)/1.9,0,1), hp*w2*(1-np.clip((t-6.1)/1.9,0,1))],1)
out=np.tanh(out*1.2); out/=np.abs(out).max(); out*=0.8
d=(out*32767).astype(np.int16)
with wave.open('music.wav','wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(d.tobytes())
print('ok')
