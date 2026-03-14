import './MainPage.css';

export function MainPage() {
  return (
    <div className="main-page main-palette" data-testid="main-page">
      <div className="content-area">
        <section className="content-section" data-testid="about-sectoin">
          <h2>About Me</h2>
          <ul>
            <li>
              I'm a curious thinker. Most days, a developer passionate about
              cyber security and creating experiences that blend creativity with
              technical excellence.
            </li>
            <li>
              I believe security should be baked into the design from the start,
              not treated as an afterthought.
            </li>
            <li>
              Former graduate in psychology. I enjoy stepping into the user's
              shoes to create experiences that make them crack a smile, while
              maintaining strict data protection standards.
            </li>
            <li>Sometimes, I think I am a bit of a dog whisperer.</li>
          </ul>
        </section>

        <section className="content-section" data-testid="skills-section">
          <h2>Skills</h2>
          <ul>
            <li>Full-Stack Development</li>
            <li>Security Engineering</li>
            <li>Systems Thinking</li>
            <li>Metacognition</li>
            <li>Risk Awareness</li>
          </ul>
        </section>

        <section className="content-section" data-testid="interests-section">
          <h2>Interests</h2>
          <ul>
            <li>Creative coding</li>
            <li>
              Cyber security. Engaging in HackTheBox and community events with
              infosec professionals
            </li>
            <li>Learning foreign languages. (I'm also a language tutor)</li>
            <li>
              Food. The cooking, science, and the history of food. (And of
              course, the eating)
            </li>
            <li>Hanging out with dogs</li>
          </ul>
        </section>
      </div>

      {/* Game render layer */}
      <div className="game-layer" data-testid="game-layer">
        {/* Game canvas here */}
      </div>
    </div>
  );
}
