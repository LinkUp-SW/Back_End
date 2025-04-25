pipeline {
    agent any
    environment {
        CI = "true"  
        VAULT_SECRET = vault path: 'secret/jenkins/Back_env', engineVersion: "2", key: 'value'
        DOCKERHUB_CREDENTIALS = credentials('docker-token')
        IMAGE_TAG = "${BUILD_NUMBER}"
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
                   sh """
                        docker run --rm -p 3000:3000 --env-file .env ${IMAGE_NAME}:${BUILD_NUMBER} \
                        sh -c 'npm start & \
                        sleep 5 && \
                        curl --fail http://localhost:3000/health/code'
                    """
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

                    sh '''
                        docker stop backend || true
                        docker rm backend || true
                        docker run -d --name backend --env-file .env -p 3000:3000 "$IMAGE_NAME:$BUILD_NUMBER"
                    '''
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
