- Make surface view like [this](https://chrisboligprojects.pythonanywhere.com/fdm), see also [this link](https://discourse.threejs.org/t/finite-difference-method-for-wave-equation/52822) and [repo](https://github.com/chrismars91/fdm)
- Make Fourier transform demo like this [WaveBuilder](https://physics.weber.edu/schroeder/software/WaveBuilder.html)
- Dat betekent dat je waarschijnlijk zonder extra werk ook al deze dingen kunt bouwen:
  - Mean curvature coloring
  - Principal curvature coloring (k1, k2)
  - Shape index coloring
  - Curvature magnitude coloring
  - Principal direction glyphs
  - Principal curvature line tracing
  - Geodesic fields
- Overigens: als je straks wateroppervlakken wilt die echt mooi ogen, 
  zou ik ook een klein beetje numerieke viscositeit toevoegen. Daardoor verdwijnen 
  hoge frequenties sneller dan lage frequenties en krijg je veel natuurlijkere 
  regendruppelringen. Dat is meestal het verschil tussen "werkt" en "ziet eruit als water". 
  Je architectuur is inmiddels precies goed opgezet om dat later als een extra operator 
  toe te voegen.
- 