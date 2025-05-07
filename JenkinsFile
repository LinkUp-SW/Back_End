pipeline {
     agent any
     environment {
         CI = "true"  
         VAULT_SECRET = vault path: 'secret/jenkins/Back_env', engineVersion: "2", key: 'value'
         DOCKERHUB_CREDENTIALS = credentials('docker-token')
         IMAGE_TAG = "${BUILD_NUMBER}"
         HEALTH_CHECK_URL = credentials('health-check-url')
     }
     stages {
         stage('Checkout') {
             steps {
                 sh ' rm -rf mywork'
                 checkout scm      
                 //#sh 'mkdir mywork && mv * mywork/ 2>/dev/null || true' 
                 }
         }
        /*
        stage('Install Dependencies') { 
             steps {
                 echo 'installing dependencies...' 
                 sh '''
                     cd mywork
                     npm install
                 '''
                  
             }
         }
         stage('Build') { 
             steps {
                  echo 'building...' 
                 sh '''
                     cd mywork
                     npm run build
                     cd ..
                     rm -rf mywork
                  '''
             }
         }
         */
 
          stage('prepare environment') {
             steps {
                 echo 'setting up environment variables...'   
                 writeFile file: '.env', text: "${VAULT_SECRET}"
             }
         }
         stage('Build Docker Image') {
             steps {
                withCredentials([string(credentialsId: 'DockerHub-back-repo', variable: 'IMAGE_NAME')]) {
                     sh '''
                         docker build -t "$IMAGE_NAME:$BUILD_NUMBER" .
                     '''
                 }
             }
         }
         stage('Test Image Locally') {
             when {
                 not {
                     branch 'main'
                 }
             }
            steps {
                 withCredentials([string(credentialsId: 'DockerHub-back-repo', variable: 'IMAGE_NAME')]) {
                 script {
                    try {
                     sh """
                         docker run --rm --name backend-test -p 3001:3000 --env-file .env ${IMAGE_NAME}:${BUILD_NUMBER} \
                         sh -c 'npm start & \
                         sleep 5 && \
                         echo "Health check starting..." && \
                         curl -v --fail ${HEALTH_CHECK_URL} || (echo "Health check failed"; exit 1)'
                     """
                 } catch (e) {
                     sh "docker logs backend-test"  // Capture container logs on failure
                     error("Health check failed: ${e.getMessage()}")
                 }
                 }
             }
            }
         }
 
        stage('Push and Deploy') {
             when {
                 branch 'main'
             }
             steps {
                 withCredentials([
                     string(credentialsId: 'DockerHub-back-repo', variable: 'IMAGE_NAME'),
                     usernamePassword(credentialsId: 'docker-token', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')
                 ]) {
                     sh '''
                         echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                         docker push "$IMAGE_NAME:$BUILD_NUMBER"
                         docker tag "$IMAGE_NAME:$BUILD_NUMBER" "$IMAGE_NAME:latest"
                         docker push "$IMAGE_NAME:latest"
                     '''
         
                     script {
                         try {
                             sh '''
                                 docker stop backend || true
                                 docker rm backend || true
                                 docker run -d --name backend --env-file .env -p 3000:3000 "$IMAGE_NAME:$BUILD_NUMBER"
                             '''
                             
                             //  production health check
                             sh '''
                                 echo "Waiting for production container to start..."
                                 sleep 5
                                 for i in {1..5}; do
                                     if curl -sSf ${HEALTH_CHECK_URL}; then
                                         echo "Production health check passed!"
                                         exit 0
                                     fi
                                     echo "Attempt $i/5 - Service not ready..."
                                     sleep 3
                                 done
                                 echo "Production health check failed after 5 attempts"
                                 exit 1
                             '''
                         } catch (e) {
                             sh "docker logs backend"  // Show logs on failure
                             error("Production deployment failed: ${e.getMessage()}")
                         }
                     }
                 }
             }
         }
     
         /*
         stage('Push to Docker Hub') {
           steps {
                 withCredentials([
                     string(credentialsId: 'DockerHub-back-repo', variable: 'IMAGE_NAME'),
                     usernamePassword(credentialsId: 'docker-token', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')
                 ]) {
                     sh """
                         echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                         docker push "$IMAGE_NAME:$BUILD_NUMBER"
                         docker tag "$IMAGE_NAME:$BUILD_NUMBER" "$IMAGE_NAME:latest"
                         docker push "$IMAGE_NAME:latest"
                     """
                 }
             }
         }
 
         stage('Deploy Locally') {
                    steps {
                 withCredentials([
                     string(credentialsId: 'DockerHub-back-repo', variable: 'IMAGE_NAME')
                 ]) {
                     
         
                     sh '''
                         docker pull "$IMAGE_NAME:$BUILD_NUMBER"
                         docker stop backend || true
                         docker rm backend || true
                         docker run -d --name backend --env-file .env -p 3000:3000 "$IMAGE_NAME:$BUILD_NUMBER"
                     '''
                 }
             }
         }
         */
     }
     post {
         success {
             script {
                  githubNotify context: 'Pipeline Wizard Speaking',
                          description: 'Build successful, good job :)',
                          status: 'SUCCESS',
                          repo: 'Back_End',
                          credentialsId: 'notify-token',
                          account: 'LinkUp-SW',
                          sha: env.GIT_COMMIT
                 // Trigger E2E test job
                 build job: 'run-e2e-tests', wait: false, parameters: [
                 string(name: 'SOURCE_REPO', value: 'Back_End'),
                 string(name: 'COMMITTER_EMAIL', value: "${env.GIT_COMMITTER_EMAIL ?: 'marwan.emam.20@gmail.com'}")
             ]
             }
         }
         failure {
             script {
                 githubNotify context: 'Pipeline Wizard Speaking',
                          description: 'Build failed, rage3 nafsak :(',
                          status: 'FAILURE',
                          repo: 'Back_End',
                          credentialsId: 'notify-token',
                          account: 'LinkUp-SW',
                          sha: env.GIT_COMMIT
             }
         }
     }
 
 }