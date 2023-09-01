import React from 'react';

import style from './VideoSection.module.css';

const VideoSection: React.FC = () => {
  return (
    <section className={style.videoSection}>
      <div className={style.videoContainer}>
        <iframe
          className={style.video}
          width="960"
          height="540"
          src={`https://www.youtube.com/embed/`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className={style.videoCover}></div>
      </div>
    </section>
  );
};

export default VideoSection;
