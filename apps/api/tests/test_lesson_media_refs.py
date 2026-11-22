from app.features.enrollment.interface.router import video_companion_refs


def test_a_video_has_its_subtitles_and_poster_beside_it() -> None:
    captions, poster = video_companion_refs("cursos/capsulas-canva/c1-pide-el-borrador.mp4")

    assert captions == "cursos/capsulas-canva/c1-pide-el-borrador.vtt"
    assert poster == "cursos/capsulas-canva/c1-pide-el-borrador.jpg"
